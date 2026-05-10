import {
  BadRequestException,
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Connection, Repository } from 'typeorm';
import { UserAccount, UserAccountStatus } from '../user/entities/user.entity';
import { ConsentAuditLog } from '../user/entities/consent-audit-log.entity';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { auth_actions_html } from '../../common/utils/notification-templates/auth-actions-helper';
import { AbstractService } from 'src/common/abstract.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthActions, AuthRequestType } from './entities/auth.entity';
import { TokenVerifyActionDto } from './dto/forgot-password-action.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import { RegisterStepTwoDto } from './dto/register-step-two.dto';
import { KycLevel } from 'src/kyc-levels/entities/kyc-level.entity';
import { KycLevelsService } from 'src/kyc-levels/kyc-levels.service';
import { AccountSetting } from '../account-settings/entities/account-setting.entity';
import { VerifyEmailLaterDto } from './dto/verify-email-later.dto';
import { SetTempLoginDto } from './dto/set-temp-login.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { LoginWithhTempPinDto } from './dto/login-with-temp-pin.dto';
import { EnvService } from 'src/common/env.service';
import { AccountSettingsService } from '../account-settings/account-settings.service';
import { UserSecurityQuestion } from 'src/user-security-questions/entities/user-security-question.entity';
import { ResetTxnPinDto } from './dto/reset-txn-pin.dto';
import { LoginHistoryService } from '../login-history/login-history.service';
import { ClientProxy } from '@nestjs/microservices';
import { OwnerDoc } from '../owner-docs/entities/owner-doc.entity';
import { UserType } from 'src/admin/admin/entities/admin.entity';
import { Request } from 'express';
import { AdminRegisterUserDto } from './dto/admin-register-user.dto';
import { NubanAccountsService } from 'src/sidecars/nuban-accounts/nuban-accounts.service';
import * as crypto from 'crypto';
import { JwtAuthUtilsService } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { DeviceService } from '../device-details/device-details.service';
import { CreateDeviceDto } from '../device-details/dto/device-details.dto';
// import { ValidateTxnPinDto } from './dto/validate-txn-pin.dto';
// import { SetTxnPinDto } from './dto/set-txn-pin.dto';

const env_config = new EnvService().read();
const ACCT_BASE_URL = env_config.ACCT_BASE_URL;
const SAVEINVEST_BASE_URL = env_config.SAVEINVEST_BASE_URL;
const FRONT_END_BASE_URL = env_config.FRONT_END_BASE_URL;
const ACCESS_AUTH = env_config.ACCESS_AUTH;
const REFRESH_AUTH = env_config.REFRESH_AUTH;
const currency = 'NGN';
// const IV_LENGTH = 16; // AES block size for CBC mode
// const ENCRYPTION_KEY = process.env.PAYLOAD_ENCRYPTION_SECRET;

@Injectable()
export class AuthService extends AbstractService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(AuthActions)
    private authActionsRepository: Repository<AuthActions>,
    @Inject('USER_SERVICE') private readonly user_client: ClientProxy,
    private userService: UserService,
    private connection: Connection,
    private kycLevelService: KycLevelsService,
    private accountSettingService: AccountSettingsService,
    private loginHistoryService: LoginHistoryService,
    private nubanAccountsService: NubanAccountsService,
    private readonly jwtAuthUtilsService: JwtAuthUtilsService,
    private readonly deviceService: DeviceService,
  ) {
    super(authActionsRepository);
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: UserAccount; request_token: string }> {
    await this.validateEmail(registerDto);
    await this.validateConfirmPassword(registerDto);

    delete registerDto.password_confirm;

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const first_kyc = await this.getFirstKycLevel();
      const referral_code = await this.genAuthUserReferralCode();
      const hash = await this.hashDetail(registerDto.password);

      const user_data = {
        ...registerDto,
        kyc_level: { id: first_kyc.id },
        currency: currency,
        referral_code: referral_code,
        password: hash,
        device_hash: registerDto.device_hash,
        account_status: UserAccountStatus.INACTIVE,
        consent_timestamp: registerDto.terms_accepted ? new Date() : null,
        policy_version: registerDto.terms_accepted
          ? registerDto.policy_version || 'v1.0'
          : null,
      };

      const user = await queryRunner.manager.save(UserAccount, user_data);

      // --- Consent Audit Log (Only if provided) ---
      if (registerDto.terms_accepted && registerDto.privacy_policy_accepted) {
        const consentLog = new ConsentAuditLog();
        consentLog.user_id = user.id;
        consentLog.terms_accepted = registerDto.terms_accepted;
        consentLog.privacy_policy_accepted =
          registerDto.privacy_policy_accepted;
        consentLog.marketing_consent = registerDto.marketing_consent || false;
        consentLog.policy_version = user_data.policy_version;
        consentLog.ip_address = registerDto.device_hash;
        consentLog.user_agent = registerDto.userAgent;
        await queryRunner.manager.save(ConsentAuditLog, consentLog);
      }

      if (registerDto.browserName) {
        const devicePayload: CreateDeviceDto = {
          browserName: registerDto.browserName,
          userAgent: registerDto.userAgent,
          os: registerDto.os,
          platform: registerDto.platform,
          deviceHash: registerDto.device_hash,
          userId: user.id.toString(),
        };

        await this.deviceService.create(devicePayload);
      }

      // send verify email notification
      const { auth_action, request_token } = await this.verifyEmail(
        user.email,
        user.id,
      );

      if (auth_action) {
        this.logger.log(`Verify Email Notification Sent to ${user.email}`);
      }

      await queryRunner.commitTransaction();
      return {
        user: user,
        request_token: request_token,
      };
    } catch (error) {
      this.logger.error(
        `Registration failed for ${registerDto.email}`,
        error.stack,
      );
      await queryRunner.rollbackTransaction();
      if (error instanceof NotAcceptableException) {
        throw error;
      }
      throw new NotAcceptableException(error.message || 'Registration failed');
    } finally {
      await queryRunner.release();
    }
  }

  async registerSteptwo(
    registerStepTwoDto: RegisterStepTwoDto,
    client_ip: string,
  ): Promise<any> {
    const { user_id, ...others } = registerStepTwoDto;
    const { date_of_birth } = registerStepTwoDto;
    const user_txn_ref = await this.genUserTxnRef();

    const u_user = await this.userService.findOne({ id: user_id });

    // check if user details were already updated
    if (u_user && u_user.phone != null) {
      this.otherSignupActions(u_user, client_ip);

      const access_token = await this.signJwt(u_user, client_ip);
      const user_data = {
        user: u_user,
        ...access_token,
      };

      return user_data;
    } else {
      // validate user and phone
      const user = await this.validateUserNPhone(registerStepTwoDto);

      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (user.user_txn_ref == null || user.user_txn_ref.length < 1) {
          // update user details
          const u_user_data = {
            ...user,
            ...others,
            date_of_birth: new Date(date_of_birth).toDateString(),
            user_txn_ref: user_txn_ref,
          };

          const user_update = await queryRunner.manager.update(
            UserAccount,
            { id: user.id },
            u_user_data,
          );

          if (!user_update) {
            throw new NotImplementedException('User Details Update Failed');
          }
        }

        // find user account settings
        let acc_setns: AccountSetting;
        acc_setns = await this.accountSettingService.findOne({
          user_id: user.id,
        });

        if (!acc_setns) {
          // create user account settings records
          acc_setns = await queryRunner.manager.save(AccountSetting, {
            user_id: user.id,
          });
        }

        await queryRunner.commitTransaction();

        // find updated user
        const updated_user = await this.userService.findOne({ id: user.id });

        // don't wait for this to return
        this.otherSignupActions(updated_user, client_ip);

        const access_token = await this.signJwt(updated_user, client_ip);
        const user_data = {
          user: updated_user,
          ...access_token,
        };

        return user_data;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new NotImplementedException('Opps!, User update failed.');
      } finally {
        await queryRunner.release();
      }
    }
  }

  async adminRegisterUser(
    adminRegisterUserDto: AdminRegisterUserDto,
    client_ip: string,
  ) {
    const { email, date_of_birth } = adminRegisterUserDto;
    const user_txn_ref = await this.genUserTxnRef();

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let user = await this.userService.findOne({ email });
      let isNewUser = false;

      if (user) {
        // 🔁 Update existing user
        await queryRunner.manager.update(UserAccount, user.id, {
          ...adminRegisterUserDto,
          currency: currency,
          account_status: UserAccountStatus.ACTIVE,
          date_of_birth: new Date(date_of_birth).toDateString(),
          user_txn_ref: user.user_txn_ref ?? user_txn_ref,
        });

        user = await this.userService.findOne({ id: user.id });
      } else {
        // 🆕 New user — generate required details
        const hash = await this.hashDetail(`${this.genDefaultPassword()}`);
        const first_kyc = await this.getFirstKycLevel();
        const referral_code = await this.genAuthUserReferralCode();

        const user_data = {
          ...adminRegisterUserDto,
          device_hash: 'admin',
          kyc_level: { id: first_kyc.id },
          currency: currency,
          referral_code,
          password: hash,
          account_status: UserAccountStatus.ACTIVE,
          date_of_birth: new Date(date_of_birth).toDateString(),
          user_txn_ref,
        };

        user = await queryRunner.manager.save(UserAccount, user_data);
        isNewUser = true;
      }

      // ✅ Ensure Account Settings exist
      let acc_setns = await this.accountSettingService.findOne({
        user_id: user.id,
      });

      if (!acc_setns) {
        acc_setns = await queryRunner.manager.save(AccountSetting, {
          user_id: user.id,
        });
      }

      await queryRunner.commitTransaction();

      const updated_user = await this.userService.findOne({ id: user.id });

      if (isNewUser) {
        await this.otherSignupActions(updated_user, client_ip);
      }

      return updated_user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new NotAcceptableException(error);
    } finally {
      await queryRunner.release();
    }
  }

  async validateUserNPhone(registerStepTwoDto: RegisterStepTwoDto) {
    const { user_id, phone } = registerStepTwoDto;
    const user: UserAccount = await this.userService.findOne(user_id);
    if (!user) throw new NotFoundException('User Not Found');

    const existing_phone = await this.userService.findOne({
      phone,
    });

    if (existing_phone)
      throw new NotAcceptableException('Phone Number Already Exist');

    return user;
  }

  async otherSignupActions(updated_user: UserAccount, client_ip: string) {
    try {
      // other signup actions
      await this.userService.createUserWallet(updated_user, client_ip);
      await this.createUserSavingsNInvtWallets(updated_user, client_ip);
    } catch (error) {
      this.logger.error(
        `[Auth] Other signup actions failed for user ${updated_user.id}: ${
          error?.message || error
        }`,
      );
      // Non-blocking: we don't rethrow to avoid crashing the main registration/login flow
    }
  }

  async hashDetail(field: string): Promise<string> {
    return await bcrypt.hash(field, 12);
  }

  async setTemporaryLogin(setTempLoginDto: SetTempLoginDto, client_ip: string) {
    // only set this when user is already logged in. The session should still be active
    const { pin, session_token } = setTempLoginDto;
    const { username } = await this.jwtAuthUtilsService.validateToken(
      session_token,
      client_ip,
      false,
    );

    let user: UserAccount;
    if (username) {
      user = await this.getUserWithUsername(username);
    }

    const hash = await this.hashDetail(pin);
    const u_user = await this.userService.update(user.id, {
      temp_login_pin: hash,
    });

    return u_user;
  }

  async updateTxnPin(user: UserAccount, txn_pin: number) {
    const pin = await this.userService.validatePinLength(txn_pin);
    const hash = await this.userService.hashTxnPin(pin);
    const u_user = await this.userService.update(user.id, {
      txn_pin: hash,
    });

    return u_user;
  }

  async resetTxnPin(resetTxnPinDto: ResetTxnPinDto) {
    const { email, password, new_txn_pin } = resetTxnPinDto;

    // validate user password
    const user = await this.validateUser(email, password);

    // validate user security question and answer,
    await this.ValidateUserSecurityQue(resetTxnPinDto, user);

    // hash new pin and reset
    const u_user = await this.updateTxnPin(user, new_txn_pin);
    return u_user;
  }

  async compareSecurityQueAnswer(passed_answer: string, hashed_answer: string) {
    return await this.bcryptCompare(passed_answer, hashed_answer);
  }

  async ValidateUserSecurityQue(
    resetTxnPinDto: ResetTxnPinDto,
    user: UserAccount,
  ) {
    const { question_id, answer } = resetTxnPinDto;

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();

    const user_sec_que = await queryRunner.manager.findOne(
      UserSecurityQuestion,
      {
        id: question_id,
        user_id: user.id,
      },
    );

    await queryRunner.release();

    if (!user_sec_que)
      throw new NotFoundException('No Matching Security Question For User');

    if (!(await this.compareSecurityQueAnswer(answer, user_sec_que.answer))) {
      throw new NotAcceptableException('Invalid Answer To Security Question');
    }
  }

  async validateUser(
    email: string,
    pass: string,
    deviceData?: Partial<CreateDeviceDto>,
  ): Promise<any> {
    const user: UserAccount = await this.userService.findOne({ email });

    if (!user) throw new NotFoundException('Incorrect Login Details');

    if (user.account_status === UserAccountStatus.BLOCKED)
      throw new NotAcceptableException('User Account Blocked. Contact Support');

    if (!(await this.bcryptCompare(pass, user.password)))
      throw new NotAcceptableException('Incorrect Login Details');

    if (user.account_status === 'LOCKED')
      throw new NotAcceptableException('Account Locked. Contact Support');

    if (user.account_status === 'BANNED')
      throw new NotAcceptableException('Account Banned. Contact Support');

    if (deviceData && deviceData.deviceHash) {
      console.log('I got here');

      const savedDevices = await this.deviceService.findByUser(user.id);
      console.log('savedDevices', savedDevices);

      if (!savedDevices || savedDevices.length === 0) {
        // First time login from any device → save and allow login
        await this.deviceService.create({
          userId: user.id.toString(),
          browserName: deviceData.browserName,
          os: deviceData.os,
          platform: deviceData.platform,
          userAgent: deviceData.userAgent,
          deviceHash: deviceData.deviceHash,
        });
      }

      const existingDevice = (savedDevices || []).find(
        (d) => d.deviceHash === deviceData.deviceHash,
      );

      // Check if this is a new device (not in saved devices list)
      if (
        !existingDevice &&
        Array.isArray(savedDevices) &&
        savedDevices.length > 0
      ) {
        const request_token = await this.genAuthActionToken();
        const request_otp = await this.genAuthActionOtp();

        const { browserName, os, platform } = deviceData;

        let deviceInfo = '';
        if (platform?.toLowerCase() === 'web' || browserName) {
          deviceInfo = `${browserName || 'Unknown browser'} on ${
            os || 'Unknown OS'
          }`;
        } else if (platform?.toLowerCase() === 'mobile') {
          deviceInfo = `${os || 'Mobile device'}`;
        } else {
          deviceInfo = `${os || platform || 'Unknown device'}`;
        }

        const message1 = `We detected a login attempt from a new ${
          platform || 'device'
        } (${deviceInfo}). To ensure the security of your account, please use the One-Time Password (OTP) below to complete your login.`;
        const message2 = `This OTP is valid for 5 minutes only and will expire after use. If you did not attempt to log in, please ignore this email and consider changing your password immediately.`;

        const data = {
          heading_logo: ``,
          heading: `New Device Login Verification`,
          message1,
          message2,
          message3: ``,
          request_otp,
          url: '',
          type: AuthRequestType.LOGIN_OTP,
        };

        const html = auth_actions_html(data);
        const request_ref = await this.genNotificationRef();

        const login_otp_notfn = {
          sender: 'GDL',
          title: 'New Device Login OTP',
          description: 'OTP New Device Login Attempt',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: user.email,
          recipients_phone_number: 'null',
          request_ref: `DEVICE_${request_ref}`,
          message: `${message1} ${message2}`,
          html: null,
          complete_html_body: html,
          show_advert: false,
          purpose: 'register',
        };

        const auth_action_data = {
          notification_data: login_otp_notfn,
          user_id: user.id,
          request_type: AuthRequestType.LOGIN_OTP,
          request_token: `${request_token}`,
          request_otp: `${request_otp}`,
          email: user.email,
        };

        // Fire-and-forget: OTP already saved to DB. Notification failure must not block login.
        this.authActionNotification(auth_action_data).catch((err) =>
          console.error(
            '[Auth] Device verification notification failed (non-blocking):',
            err?.message || err,
          ),
        );

        return {
          requires_device_verification: true,
          token: request_token,
          email: user.email,
        };
      }
    }

    if (user.is_2fa_enabled) {
      const request_token = await this.genAuthActionToken();
      const request_otp = await this.genAuthActionOtp();

      const message1 = `To complete your secure login, please use the One-Time Password (OTP) provided below. This is required due to your enabled two-factor authentication settings.`;
      const message2 = `This OTP is valid for 5 minutes only and will expire after use. If you did not attempt to log in, please ignore this email and consider changing your password immediately.`;

      const data = {
        heading_logo: ``,
        heading: `Login Verification`,
        message1,
        message2,
        message3: ``,
        request_otp,
        url: '', // not needed for login OTP
        type: AuthRequestType.LOGIN_OTP,
      };

      const html = auth_actions_html(data);
      const request_ref = await this.genNotificationRef();

      const login_otp_notfn = {
        sender: 'GDL',
        title: 'Login OTP',
        description: 'OTP Login Attempt',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: user.id,
        recipients_email: user.email,
        recipients_phone_number: 'null',
        request_ref: `2FA_${request_ref}`,
        message: `${message1} ${message2}`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'register',
      };

      const auth_action_data = {
        notification_data: login_otp_notfn,
        user_id: user.id,
        request_type: AuthRequestType.LOGIN_OTP,
        request_token: `${request_token}`,
        request_otp: `${request_otp}`,
        email: user.email,
      };

      // Fire-and-forget: OTP already saved to DB. Notification failure must not block login.
      this.authActionNotification(auth_action_data).catch((err) =>
        console.error(
          '[Auth] 2FA notification failed (non-blocking):',
          err?.message || err,
        ),
      );

      // Return partial user and token to continue login flow
      return {
        requires_2fa: true,
        token: request_token,
        email: user.email,
      };
    }

    return user;
  }

  async bcryptCompare(passed: string, to_compare: string) {
    return await bcrypt.compare(passed, to_compare);
  }

  async validateUserWithTempPin(
    loginWithTempPin: LoginWithhTempPinDto,
  ): Promise<any> {
    const { device_hash, email, pin } = loginWithTempPin;
    const user = await this.userService.findOne({
      device_hash,
      email,
    });

    const temp_login_pin = pin.toString();

    if (!user)
      throw new NotFoundException(
        'Unrecognized Device. Please Login With Your Username and Password',
      );

    if (user.account_status == 'LOCKED')
      throw new NotAcceptableException('Account Locked, Contact Support');

    if (user.account_status == 'BANNED')
      throw new NotAcceptableException('Account Banned, Contact Support');

    if (!(await bcrypt.compare(temp_login_pin, user.temp_login_pin)))
      throw new NotAcceptableException('Invalid Credentials');

    return user;
  }

  async getUserAfterTokenVerify(
    validateTokenDto: ValidateTokenDto,
    client_ip: string,
  ) {
    const { token } = validateTokenDto;
    const { username } = await this.jwtAuthUtilsService.validateToken(
      token,
      client_ip,
      false,
    );

    let user: UserAccount;
    if (username) {
      user = await this.getUserWithUsername(username);

      const user_doc: OwnerDoc = await this.fetchUserDocs(user.id);
      console.log('user_doc', user_doc);

      if (user_doc) {
        // validate uploaded docs
        user = await this.userService.validateUploadedDocs(user, user_doc);
        console.log('user', user);
      }

      // update last login
      await this.userService.update(user.id, {
        last_login: new Date(Date.now()).toISOString(),
      });

      // perform the actions without waiting for them
      // this.sendLoginNotification(client_ip, user);
      this.storeLoginDetails(user, validateTokenDto);
    }

    const uuser = await this.userService.deleteUserFields(user);
    return uuser;
  }

  async sendLoginNotification(
    client_ip: string,
    user: UserAccount,
    deviceData?: Partial<CreateDeviceDto>,
  ) {
    const formated_date = new Date(Date.now()).toDateString();
    const formated_time = new Date(Date.now()).toLocaleTimeString();

    // Build device information string
    let deviceInfo = 'Unknown device';
    if (deviceData) {
      const { browserName, os, platform } = deviceData;
      if (platform?.toLowerCase() === 'web' || browserName) {
        deviceInfo = `${browserName || 'Unknown browser'} on ${
          os || 'Unknown OS'
        }`;
      } else if (platform?.toLowerCase() === 'mobile') {
        deviceInfo = `${os || 'Mobile device'}`;
      } else {
        deviceInfo = `${os || platform || 'Unknown device'}`;
      }
    }

    const message1 = `Welcome back! Your GDL account was successfully accessed on ${formated_date} at ${formated_time}. Login Details: ${deviceInfo} (IP: ${client_ip}). `;
    const message2 = `Login Details: ${deviceInfo} (IP: ${client_ip}).  If you did not initiate this login, please change your password immediately and contact our Customer Care on +2347054435000 or email gdlonline@housemoni.ng`;
    const message3 = ``;

    const data = {
      heading_logo: ``,
      heading: `Successful Login Alert`,
      message1,
      message2,
      message3,
      cta: ``,
      request_otp: '',
      url: ``,
      type: AuthRequestType.LOGIN_OTP,
    };

    const html = auth_actions_html(data);
    const request_ref = await this.genNotificationRef();

    const login_notification = {
      sender: 'GDL',
      title: 'GDL Account Login Notification',
      description: 'Your GDL account has been successfully signed in.',
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: user.id,
      recipients_email: user.email,
      recipients_phone_number: user.phone,
      request_ref: `LOGN_${request_ref}`,
      message: `${message1} ${message2} ${message3}`,
      html: 'null',
      complete_html_body: html,
      show_advert: false,
      purpose: 'register',
    };

    await this.sendUserNotification(login_notification);
  }

  async storeLoginDetails(
    user: UserAccount,
    validateTokenDto: ValidateTokenDto,
  ) {
    const { long, lat, ip } = validateTokenDto;
    const his = await this.loginHistoryService.createUserLoginHistory({
      user_id: user.id,
      user_ip: ip,
      user_location: '',
      longitude: long,
      latitude: lat,
    });

    // resolve this and then reupdate user login history
    // const user_location = await this.resolveGoeCode(long, lat);
  }

  async validateEmail(registerDto: RegisterDto | any): Promise<any> {
    const existing_acct = await this.userService.findOne({
      email: registerDto.email,
    });

    if (existing_acct) throw new NotAcceptableException('Email Already Exist');
  }

  async validateConfirmPassword(registerDto: RegisterDto) {
    const { password, password_confirm } = registerDto;

    if (password !== password_confirm) {
      throw new NotAcceptableException('Passwords Do Not Match');
    }
  }

  async verifyEmailLater(verifyEmailLaterDto: VerifyEmailLaterDto) {
    const { user_id, email } = verifyEmailLaterDto;
    const { auth_action, request_token } = await this.verifyEmail(
      email,
      user_id,
    );

    if (auth_action) console.log('Verify Email Notificaiton Sent');

    return request_token;
  }

  async validatePhone(phone: string) {
    const phone_taken = await this.userService.findOne({
      phone: phone,
    });

    if (phone_taken)
      throw new NotAcceptableException('Phone Number Already Exist');
  }

  async validatePhoneExist(phone: string) {
    const phone_taken = await this.userService.findOne({
      phone: phone,
    });

    if (phone_taken) {
      return {
        phone_exists: true,
        message: 'Phone Number Already Exist',
      };
    } else {
      return {
        phone_exists: false,
        message: 'No Similar Existing Phone Number',
      };
    }
  }

  async createUserWallet(user: UserAccount): Promise<any> {
    const data_to_post = {
      user_id: user.id,
      email: user.email,
      wallet_ref: user.user_txn_ref,
      phonenumber: user.phone,
      firstname: user.first_name,
      lastname: user.last_name,
      currency: currency,
    };

    const user_wallet = await this.userService.postData(
      `${ACCT_BASE_URL}/wallet`,
      data_to_post,
    );

    if (!user_wallet)
      throw new NotImplementedException(
        'User Wallet Could Not Be Created. An Error Occured',
      );

    return user_wallet;
  }

  async createUserSavingsNInvtWallets(
    user: UserAccount,
    client_ip: string,
  ): Promise<any> {
    const data_to_post = {
      user_id: user.id,
      wallet_ref: user.user_txn_ref,
    };

    // sign user token for sign up actions
    const refresh_token = await this.userService.signTempRefreshTokens(
      user,
      client_ip,
    );

    if (!SAVEINVEST_BASE_URL) {
      throw new InternalServerErrorException(
        'SAVEINVEST_BASE_URL is not configured in environment variables',
      );
    }

    const save_invest_wallet = await this.userService.postData(
      `${SAVEINVEST_BASE_URL}/saveinvest/investment/wallet`,
      data_to_post,
      refresh_token,
    );

    if (!save_invest_wallet)
      throw new NotImplementedException(
        'User Savings And Investment Wallet Could Not Be Created. An Error Occured',
      );

    return save_invest_wallet;
  }

  async login(
    email: string,
    pass: string,
    client_ip: string,
    deviceData?: Partial<CreateDeviceDto>,
  ) {
    const result = await this.validateUser(email, pass, deviceData);

    if (!result) {
      throw new Error('Invalid login attempt');
    }

    // If device verification is required
    if (result?.requires_device_verification) {
      return {
        requires_device_verification: true,
        token: result.token,
        email: result.email,
        message: 'OTP required to complete authentication',
      };
    }

    // If 2FA is required
    if (result?.requires_2fa) {
      return {
        requires_2fa: true,
        token: result.token,
        email: result.email,
        message: 'OTP required to complete login',
      };
    }

    // Proceed to generate and return JWT
    const tokens = await this.signJwt(result, client_ip);

    // Send login success notification (don't wait for it)
    this.sendLoginNotification(client_ip, result, deviceData).catch(() => {
      this.logger.warn('Failed to send login notification asynchronously');
    });

    return tokens;
  }

  // auth.service.ts

  async verifyLoginOtp(dto: VerifyOtpDto, client_ip: string) {
    const { email, otp, browserName, userAgent, os, platform, device_hash } =
      dto;

    const deviceData = {
      browserName,
      userAgent,
      os,
      platform,
      deviceHash: device_hash,
    };

    const authAction = await this.authActionsRepository.findOne({
      where: {
        email,
        request_type: AuthRequestType.LOGIN_OTP,
        request_otp: otp,
      },
    });

    console.log('authAction', authAction);

    if (!authAction) {
      // Run lazy cleanup to remove any expired OTPs that might be cluttering the DB
      this.lazyCleanupExpired().catch(() => {
        /* silent failure */
      });
      throw new NotFoundException('Invalid or expired OTP session');
    }

    // Check if OTP has expired
    const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
    if (now > authAction.expires_at) {
      // Remove expired OTP
      await this.authActionsRepository.remove(authAction);
      throw new NotAcceptableException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Check if OTP has already been used
    if (authAction.is_used) {
      throw new NotAcceptableException(
        'OTP has already been used. Please request a new one.',
      );
    }

    // if (authAction.request_otp !== otp || authAction.email !== email) {
    //   throw new NotFoundException('Incorrect OTP');
    // }

    // Mark OTP as used before proceeding
    authAction.is_used = true;
    await this.authActionsRepository.save(authAction);

    // ✅ OTP is correct and valid — delete the OTP session after marking as used
    await this.authActionsRepository.remove(authAction);

    // Opportunistic cleanup - runs automatically every 15 minutes
    this.opportunisticCleanup().catch(() => {
      /* silent failure */
    }); // Don't wait for cleanup to complete

    // ✅ Get the user
    const user = await this.userService.findOne({ email });

    // ✅ If device data is provided, replace old device with new one
    if (deviceData && deviceData.deviceHash) {
      const savedDevices = await this.deviceService.findByUser(user.id);
      const existingDevice = savedDevices?.find(
        (d) => d.deviceHash === deviceData.deviceHash,
      );

      // Only process if it's a new device
      if (!existingDevice) {
        // 🗑️ Delete all existing devices for this user (only allow one device)
        if (savedDevices && savedDevices.length > 0) {
          for (const device of savedDevices) {
            await this.deviceService.remove(device.id);
          }
        }

        // 💾 Save the new device
        const newDevice = await this.deviceService.create({
          userId: user.id,
          browserName: deviceData.browserName,
          os: deviceData.os,
          platform: deviceData.platform,
          userAgent: deviceData.userAgent,
          deviceHash: deviceData.deviceHash,
        });

        // 📧 Send device change notification
        await this.sendDeviceChangeNotification(user, deviceData, client_ip);
      }
    }

    // ✅ Proceed with login — generate JWT
    const tokens = await this.signJwt(user, client_ip);

    // Send login success notification (don't wait for it)
    this.sendLoginNotification(client_ip, user, deviceData).catch(() => {
      /* silent failure */
    });

    return tokens;
  }

  async signJwt(user: UserAccount, client_ip: string) {
    // Create a payload
    const payload = {
      username: user.email,
      user_id: user.id,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.email,
        client_ip,
      ), // Add fingerprint to prevent token replay
      jti: crypto.randomUUID(), // Unique token identifier for replay protection
    };

    // Encrypt the payload before signing it
    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    const access_token = await this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      ACCESS_AUTH,
    );

    // Get refresh tokens
    const refresh_token = await this.signRefreshTokens(user, client_ip);

    return { access_token, refresh_token };
  }

  async generatePermanentToken(user: UserAccount, client_ip: string) {
    // Create a payload for permanent token (no expiry)
    const payload = {
      username: user.email,
      user_id: user.id,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.email,
        client_ip,
      ),
      jti: crypto.randomUUID(),
      permanent: true, // Mark as permanent token
    };

    // Encrypt the payload before signing it
    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    // Generate permanent token with no expiry (10 years)
    const permanent_token = await this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      ACCESS_AUTH,
      '10y', // 10 years expiry
    );

    return { permanent_token };
  }

  async signRefreshTokens(user: UserAccount, client_ip: string) {
    const payload = {
      user_id: user.id,
      user_ref: user.user_txn_ref,
      account: await this.fetchUserNuban(user.id, user.user_txn_ref),
      user_type: user.user_type,
      user_name: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      roles: UserType.USER,
      client_ip: client_ip,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.email,
        client_ip,
      ), // Bind refresh token to the client fingerprint
      jti: crypto.randomUUID(), // Unique identifier for replay prevention
    };

    // Encrypt the payload before signing it
    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    // Sign refresh token with encrypted payload
    const refresh_token = this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      REFRESH_AUTH,
    );

    return refresh_token;
  }

  async loginWithTempPin(
    loginWithTempPin: LoginWithhTempPinDto,
    client_ip: string,
  ) {
    const user = await this.validateUserWithTempPin(loginWithTempPin);
    const tokens = await this.signJwt(user, client_ip);

    // Send login success notification (don't wait for it)
    this.sendLoginNotification(client_ip, user).catch(() => {
      /* silent failure */
    });

    return tokens;
  }

  async refreshToken(refresh_token: string, client_ip: string) {
    // 1. Verify the refresh token
    const decodedPayload = await this.jwtAuthUtilsService.validateRefreshToken(
      refresh_token,
      REFRESH_AUTH,
    );

    // 2. Validate fingerprint to ensure IP hasn't changed (optional but recommended for security)
    const { user_id, fingerprint, user_name } = decodedPayload;

    // Optional: Validate fingerprint if stricter security is needed
    // this.jwtAuthUtilsService.validateFingerprint(fingerprint, user_name, client_ip);

    // 3. Check if user exists and is active
    const user = await this.userService.findOne({ id: user_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.account_status !== UserAccountStatus.ACTIVE) {
      throw new NotAcceptableException('User account is inactive');
    }

    // 4. Generate new tokens (Rotation)
    // Create ACCESS token payload
    const accessPayload = {
      username: user.email,
      user_id: user.id,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.email,
        client_ip,
      ),
      jti: crypto.randomUUID(),
    };

    const encryptedAccessPayload =
      this.jwtAuthUtilsService.encryptPayload(accessPayload);
    const access_token = await this.jwtAuthUtilsService.jwTSign(
      encryptedAccessPayload,
      ACCESS_AUTH,
    );

    // Create REFRESH token payload (Rotation)
    const new_refresh_token = await this.signRefreshTokens(user, client_ip);

    return { access_token, refresh_token: new_refresh_token };
  }

  async tokenVerifyAction(tokenVerifyActionDto: TokenVerifyActionDto) {
    const { request_otp, request_token, email } = tokenVerifyActionDto;

    const auth_action = await this.authActionsRepository.findOne({
      where: {
        request_otp,
        request_token,
        email,
      },
    });

    if (!auth_action || auth_action.is_used) {
      console.log('VER_2_FIX: Auth action invalid or used');
      throw new NotFoundException('Invalid or already used OTP');
    }
    console.log('VER_2_FIX: auth_action', auth_action);

    const now = new Date();
    if (now > auth_action.expires_at) {
      await this.authActionsRepository.remove(auth_action);
      throw new NotAcceptableException(
        'OTP has expired. Please request a new one.',
      );
    }

    auth_action.is_used = true;
    await this.authActionsRepository.save(auth_action);

    return auth_action;
  }

  async createNewPassword(createNewPasswordDto: CreateNewPasswordDto) {
    const { email, new_password, request_otp, otp, request_token } =
      createNewPasswordDto;
    console.log('createNewPasswordDto', createNewPasswordDto);
    await this.tokenVerifyAction({
      email: email,
      request_otp: request_otp ? request_otp : otp,
      request_token: request_token,
    });

    const user = await this.userService.findOne({
      email: email,
    });

    const hash = await this.hashDetail(new_password);
    const update = await this.userService.update(user.id, {
      password: hash,
    });

    const uuser = await this.userService.deleteUserFields(update);
    return uuser;
  }

  async resetPassword(passwordResetDto: PasswordResetDto) {
    const { email, old_password, new_password } = passwordResetDto;
    const user = await this.validateUser(email, old_password);
    const hash = await this.hashDetail(new_password);

    const update = await this.userService.update(user.id, {
      password: hash,
    });

    const uuser = await this.userService.deleteUserFields(update);
    return uuser;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const user = await this.userService.findOne({
        where: { email: forgotPasswordDto.email },
      });

      // Always generate token regardless of user existence (security best practice)
      const request_token = await this.genAuthActionToken();

      // Return generic response to avoid user enumeration
      if (!user) {
        return { message: 'If your email exists, a reset link has been sent.' };
      }

      const user_id = user.id;
      const request_otp = await this.genAuthActionOtp();
      const request_ref = await this.genNotificationRef();

      const message1 = `You've received this message because you indicated that you forgot your password. Please use the OTP below to reset your password.`;
      const message2 = `If you did not make this request, please disregard this email.`;

      const data = {
        heading_logo: ``,
        heading: `Reset Your Password`,
        message1,
        message2,
        message3: ``,
        request_otp,
        url: `${FRONT_END_BASE_URL}/reset-password?token=${request_token}`,
        type: AuthRequestType.PASSWORD_RESET,
      };

      const html = auth_actions_html(data);

      const password_reset_notfn = {
        sender: 'GDL',
        title: 'Password Reset',
        description: 'Reset Your Password',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: user_id,
        recipients_email: forgotPasswordDto.email,
        recipients_phone_number: user.phone || null,
        request_ref: `RSET_${request_ref}`,
        message: `${message1} ${message2}`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'password_reset',
      };

      const auth_action_data = {
        notification_data: password_reset_notfn,
        user_id,
        request_type: AuthRequestType.PASSWORD_RESET,
        request_token,
        request_otp,
        email: forgotPasswordDto.email,
      };

      const auth_action = await this.authActionNotification(auth_action_data);

      // Return generic success message with actual expiry time
      return auth_action?.request_token || request_token;
    } catch (error) {
      console.error('Forgot password error:', error);
      // Return success even on error to prevent user enumeration
      return { message: 'If your email exists, a reset link has been sent.' };
    }
  }

  async resendOtp(email: string): Promise<any> {
    const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
    const EXPIRY_MINUTES = 5;

    // ✅ Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new NotFoundException('Invalid email format');
    }

    // ✅ Rate-limit requests to 1 per minute
    const recentOtp = await this.authActionsRepository.findOne({
      where: { email },
      order: { created_at: 'DESC' },
    });

    if (recentOtp) {
      const diffMs = now.getTime() - new Date(recentOtp.created_at).getTime();
      if (diffMs < 60 * 1000) {
        throw new NotFoundException('Please wait before requesting a new OTP');
      }
    }

    // ✅ Fetch active OTP (if any)
    const existingAuthAction = await this.authActionsRepository.findOne({
      where: { email, is_used: false },
      order: { created_at: 'DESC' },
    });

    if (!existingAuthAction) {
      console.log('existingAuthAction', existingAuthAction);
      return {
        message: 'If this account exists, an OTP will be sent shortly',
      };
    }

    // ✅ Get user linked to the OTP
    const user = await this.userService.findOne({
      id: existingAuthAction.user_id,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const request_token = await this.genAuthActionToken();
    const request_ref = await this.genNotificationRef();
    const request_otp = await this.genAuthActionOtp();

    const message1 = `You’ve received this message because you indicated that you forgot your password. Please use the OTP below to reset your password.`;
    const message2 = `If you did not make this request, please disregard this email, and your password will not be changed.`;

    // ✅ Helper function to prepare shared email data
    const buildNotification = (otp: any) => {
      const data = {
        heading_logo: ``,
        heading: `Resend Your OTP`,
        message1,
        message2,
        message3: ``,
        request_otp: otp,
        url: `${FRONT_END_BASE_URL}/reset-password`,
        type: AuthRequestType.PASSWORD_RESET,
      };

      const html = auth_actions_html(data);

      const notificationBase = {
        sender: 'GDL',
        title: 'OTP Request',
        description: 'Verification Code Request',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: user.id,
        recipients_email: email,
        recipients_phone_number: user.phone_number ?? null,
        request_ref: `RSET_${request_ref}`,
        message: `${message1} ${message2}`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'password_reset',
      };

      return { data, html, notificationBase };
    };

    // ✅ If existing OTP still valid → just resend
    if (existingAuthAction.expires_at > now) {
      const { notificationBase } = buildNotification(
        existingAuthAction.request_otp,
      );

      this.sendUserNotification({
        ...notificationBase,
        existing: true, // flag to indicate resend
        request_otp: existingAuthAction.request_otp,
      }).catch((err) =>
        console.error(
          `[Auth] OTP resend notification failed for ${AuthRequestType.PASSWORD_RESET} (${email}):`,
          err?.response?.data || err?.message || err,
        ),
      );

      const remainingSeconds = Math.floor(
        (existingAuthAction.expires_at.getTime() - now.getTime()) / 1000,
      );

      return {
        message: 'OTP resent successfully',
        expires_in: `${remainingSeconds}s`,
      };
    }

    // ✅ If OTP expired → regenerate securely
    await this.authActionsRepository.delete(existingAuthAction.id);

    const { notificationBase } = buildNotification(request_otp);

    const auth_action_data = {
      notification_data: notificationBase,
      user_id: user.id,
      request_type: AuthRequestType.PASSWORD_RESET,
      request_token,
      request_otp,
      email,
    };

    await this.authActionNotification(auth_action_data);

    return {
      message: 'OTP sent successfully',
      email,
    };
  }

  // Use a more user friendly email message
  // Use a more user-friendly and secure email verification flow
  async verifyEmail(email: string, user_id: number): Promise<any> {
    const request_token = await this.genAuthActionToken();
    const request_otp = await this.genAuthActionOtp();

    // Hash the token so the frontend gets a safe version

    const message1 = `We're excited to welcome you to GDL!`;
    const message2 = `Please use the verification code below to confirm your email.`;

    const data = {
      heading_logo: ``,
      heading: `Welcome To GDL`,
      message1,
      message3: ``,
      cta: `CONFIRM YOUR EMAIL`,
      request_otp: String(request_otp),
      // Secure verification link
      url: `${FRONT_END_BASE_URL}/verify/user_id/email/token`, // how do we make this work ? should be harshed ?
      type: AuthRequestType.EMAIL_VERIFY,
    };

    const html = auth_actions_html(data);
    const request_ref = await this.genNotificationRef();

    const email_verify_notification = {
      sender: 'GDL',
      title: 'Welcome To GDL',
      description: 'Please Verify Your Email',
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: user_id,
      recipients_email: email,
      recipients_phone_number: null,
      request_ref: `VRFY_${request_ref}`,
      message: `${message1} ${message2}`,
      html: null,
      complete_html_body: html,
      show_advert: false,
      purpose: 'register',
    };

    const auth_action_data = {
      notification_data: { ...email_verify_notification },
      user_id: user_id,
      request_type: AuthRequestType.EMAIL_VERIFY,
      request_token: `${request_token}`,
      request_otp: `${request_otp}`,
      email: email,
    };
    const auth_action = await this.authActionNotification(auth_action_data);

    return { auth_action, request_token };
  }

  async authActionNotification(data: any): Promise<any> {
    const EXPIRY_MINUTES = 5;
    const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
    const expires_at = new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000); // WAT = UTC+1

    console.log('OTP expiry calculation:', {
      now: now.toISOString(),
      expires_at: expires_at.toISOString(),
      expiry_minutes: EXPIRY_MINUTES,
      timezone: 'WAT (UTC+1)',
    });

    const email = data.email.toLowerCase();

    // 1. Check existing unused OTP for same user or email + request_type
    const existingAuthAction = await this.authActionsRepository.findOne({
      where: [
        {
          user_id: data.user_id,
          request_type: data.request_type,
          is_used: false,
        },
        { email, request_type: data.request_type, is_used: false },
      ],
      order: { created_at: 'DESC' },
    });

    // 2. If exists and NOT expired → resend same OTP + token
    if (existingAuthAction && existingAuthAction.expires_at > now) {
      // Update notification data with existing OTP — fire-and-forget
      this.sendUserNotification({
        ...data.notification_data,
        existing: true,
        request_otp: existingAuthAction.request_otp,
      }).catch((err) =>
        console.error(
          `[Auth] OTP resend notification failed for ${data.request_type} (${
            data.email || 'N/A'
          }):`,
          err?.response?.data || err?.message || err,
        ),
      );

      return {
        message: 'OTP already active, resent successfully',
        expires_at: existingAuthAction.expires_at,
        request_token: existingAuthAction.request_token,
        request_otp: existingAuthAction.request_otp,
        id: existingAuthAction.id,
      };
    }

    // 3. If exists and expired → delete old entry
    if (existingAuthAction && existingAuthAction.expires_at <= now) {
      await this.authActionsRepository.delete(existingAuthAction.id);
    }

    // 4. Create new OTP record
    const newAuthAction = this.authActionsRepository.create({
      user_id: data.user_id,
      request_type: data.request_type,
      request_token: `${data.request_token}`,
      request_otp: `${data.request_otp}`,
      email,
      expires_at,
      is_used: false,
    });

    const savedAction = await this.authActionsRepository.save(newAuthAction);

    if (!savedAction) {
      throw new NotImplementedException('Auth Action Not Saved');
    }

    // 5. Send notification for new OTP — fire-and-forget so login is never blocked
    this.sendUserNotification({
      ...data.notification_data,
      request_otp: savedAction.request_otp,
    }).catch((err) =>
      console.error(
        `[Auth] New OTP notification failed for ${data.request_type} (${email}):`,
        err?.response?.data || err?.message || err,
      ),
    );

    return {
      message: 'New OTP created and sent successfully',
      id: savedAction.id,
      email: savedAction.email,
      request_type: savedAction.request_type,
      expires_at: savedAction.expires_at,
      request_token: savedAction.request_token,
      request_otp: savedAction.request_otp,
    };
  }

  async sendUserNotification(notification_data: any) {
    const notify_data = await this.userService.sendUserAuthNotifications(
      notification_data,
    );

    if (!notify_data)
      throw new NotImplementedException('User Notification Not Sent');

    return notify_data;
  }

  async confirmEmailVerifyAction(verifyEmailDto: VerifyEmailDto): Promise<any> {
    const auth_action = await this.tokenVerifyAction(verifyEmailDto);

    // update email verification status
    const user = await this.userService.update(auth_action.user_id, {
      email_verified: true,
      account_status: UserAccountStatus.ACTIVE,
    });
    return user;
  }

  async genAuthActionToken(): Promise<number> {
    return Math.floor(Math.random() * 100233 + 100881);
  }

  async genAuthActionOtp(): Promise<number> {
    return Math.floor(Math.random() * 100555 + 100666);
  }

  async genDefaultPassword(): Promise<number> {
    return Math.floor(Math.random() * 100445 + 100556);
  }

  async genAuthUserReferralCode(): Promise<string> {
    return `${Math.floor(Math.random() * 100000 + 100666)}`;
  }

  async genNotificationRef(): Promise<number> {
    return Math.floor(Math.random() * 1000000883 + 1000000441);
  }

  async genUserTxnRef(): Promise<string> {
    const randNum = Math.floor(Math.random() * 1000000883 + 1040066841);
    const user_txn_ref = `GDL${randNum}`;
    return user_txn_ref;
  }

  async getFirstKycLevel(): Promise<KycLevel> {
    const kyc_1 = await this.kycLevelService.findOne({ level_number: 1 });
    if (!kyc_1)
      throw new NotFoundException('User Level Configurations Not Set');
    return kyc_1;
  }

  async getUserWithUsername(username: string) {
    const user = await this.userService.findOne({ email: username }, [
      'kyc_level',
    ]);

    if (!user) throw new NotFoundException('User Not Found');

    if (user.account_status == 'LOCKED')
      throw new NotAcceptableException('Account Locked, Contact Support');

    if (user.account_status == 'BANNED')
      throw new NotAcceptableException('Account Banned, Contact Support');

    return user;
  }

  async fetchUserDocs(user_id: number) {
    console.log('user_id', user_id);
    const user_docs = await this.userService.findUserDocs(user_id);

    return user_docs;
  }

  async fetchUserNuban(user_id: number, user_account_ref: string) {
    let user_nuban = null;

    const nuban = await this.nubanAccountsService.fetchUserNuban(
      user_id,
      user_account_ref,
    );

    if (nuban) {
      user_nuban = nuban.nuban_account;
    }

    return user_nuban;
  }

  async getClientIP(req: Request) {
    // Get client IP address from headers or socket
    const clientIp =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // If `x-forwarded-for` is an array, take the first element (real client IP)
    const realIp = Array.isArray(clientIp) ? clientIp[0] : clientIp;
    return realIp;
  }

  private lastCleanup: Date = new Date(0); // Track last cleanup time
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

  /**
   * Automatic cleanup that runs opportunistically during OTP operations
   * No cron job required - cleans up when OTPs are verified
   */
  private async opportunisticCleanup(): Promise<void> {
    const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
    const timeSinceLastCleanup = now.getTime() - this.lastCleanup.getTime();

    // Only cleanup if it's been more than 15 minutes since last cleanup
    if (timeSinceLastCleanup < this.CLEANUP_INTERVAL) {
      return;
    }

    try {
      // Update last cleanup time first to prevent concurrent cleanups
      this.lastCleanup = now;

      // Cleanup expired OTPs
      const expiredResult = await this.authActionsRepository
        .createQueryBuilder()
        .delete()
        .from(AuthActions)
        .where('expires_at < :now', { now })
        .execute();

      // Cleanup old used OTPs (older than 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const usedResult = await this.authActionsRepository
        .createQueryBuilder()
        .delete()
        .from(AuthActions)
        .where('is_used = :isUsed AND created_at < :oneDayAgo', {
          isUsed: true,
          oneDayAgo,
        })
        .execute();
    } catch (error) {
      console.error('Error during opportunistic OTP cleanup:', error);
      // Reset last cleanup time on error so cleanup can be retried
      this.lastCleanup = new Date(0);
    }
  }

  /**
   * Lazy cleanup - removes expired OTPs when they're encountered
   * This method is called during OTP verification
   */
  private async lazyCleanupExpired(): Promise<void> {
    try {
      const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
      const result = await this.authActionsRepository
        .createQueryBuilder()
        .delete()
        .from(AuthActions)
        .where('expires_at < :now', { now })
        .execute();
    } catch (error) {
      console.error('Error during lazy OTP cleanup:', error);
    }
  }

  /**
   * Manual cleanup method for administrative purposes
   * Can be called via API endpoint if needed
   */
  async forceCleanupOtps(): Promise<{ expired: number; used: number }> {
    const now = new Date(new Date().getTime() + 60 * 60 * 1000); // Current time in WAT
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try {
      // Cleanup expired OTPs
      const expiredResult = await this.authActionsRepository
        .createQueryBuilder()
        .delete()
        .from(AuthActions)
        .where('expires_at < :now', { now })
        .execute();

      // Cleanup old used OTPs
      const usedResult = await this.authActionsRepository
        .createQueryBuilder()
        .delete()
        .from(AuthActions)
        .where('is_used = :isUsed AND created_at < :oneDayAgo', {
          isUsed: true,
          oneDayAgo,
        })
        .execute();

      const expired = expiredResult.affected || 0;
      const used = usedResult.affected || 0;

      // Update last cleanup time
      this.lastCleanup = now;

      return { expired, used };
    } catch (error) {
      console.error('Error during force OTP cleanup:', error);
      throw new NotImplementedException('Failed to cleanup OTPs');
    }
  }

  async sendDeviceChangeNotification(
    user: UserAccount,
    deviceData: Partial<CreateDeviceDto>,
    client_ip: string,
  ) {
    const formated_date = new Date(Date.now()).toDateString();
    const formated_time = new Date(Date.now()).toLocaleTimeString();

    const { browserName, os, platform } = deviceData;
    let deviceInfo = '';
    if (platform?.toLowerCase() === 'web' || browserName) {
      deviceInfo = `${browserName || 'Unknown browser'} on ${
        os || 'Unknown OS'
      }`;
    } else if (platform?.toLowerCase() === 'mobile') {
      deviceInfo = `${os || 'Mobile device'}`;
    } else {
      deviceInfo = `${os || platform || 'Unknown device'}`;
    }

    const message1 = `Your GDL account was successfully accessed from a new device on ${formated_date} at ${formated_time}.`;
    const message2 = `Device Details: ${deviceInfo} (IP: ${client_ip})`;
    const message3 = `Your previous device has been automatically removed for security. If you did not authorize this login, please contact support immediately.`;

    const data = {
      heading_logo: ``,
      heading: `New Device Login Confirmed`,
      message1,
      message2,
      message3,
      cta: ``,
      request_otp: '',
      url: ``,
      type: `DEVICE_CHANGE`,
    };

    const html = auth_actions_html(data);
    const request_ref = await this.genNotificationRef();

    const device_change_notification = {
      sender: 'GDL',
      title: 'New Device Login Confirmed',
      description: 'Your Account Was Accessed From New Device',
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: user.id,
      recipients_email: user.email,
      recipients_phone_number: user.phone,
      request_ref: `NEWDEV_${request_ref}`,
      message: `${message1} ${message2} ${message3}`,
      html: 'null',
      complete_html_body: html,
      show_advert: false,
      purpose: 'register',
    };

    await this.sendUserNotification(device_change_notification);
  }

  // async otherSignUpActions(user: UserAccount) {
  //   // call accounts service to create wallet
  //   const wallet = await this.userService.createUserWallet(user);
  //   if (wallet) console.log('User Wallet Created', wallet);

  //   const user_docs = await this.userService.createUserDocsRecord(user);
  //   if (user_docs) console.log('User Docs Created', user_docs);

  //   const save_invest_wallet = await this.createUserSavingsNInvtWallets(user);
  //   if (save_invest_wallet)
  //     console.log('User Savings and Investment Wallet Created');
  // }

  // async validateUserTxnPin(validateTxnPinDto: ValidateTxnPinDto): Promise<any> {
  //   const { session_token, txn_pin } = validateTxnPinDto;

  //   const { username } = await this.validateToken(session_token);

  //   let user: UserAccount;
  //   if (username) {
  //     user = await this.getUserWithUsername(username);
  //   }

  //   if (user.txn_pin == null || user.txn_pin == '') {
  //     throw new NotFoundException(
  //       'No Transaction Pin Set. Please Set Your Transaction Pin To Continue',
  //     );
  //   }

  //   if (!(await bcrypt.compare(txn_pin, user.txn_pin)))
  //     throw new NotAcceptableException('Invalid Transaction Pin');

  //   return true;
  // }

  // async validateToken(token: string): Promise<any> {
  //   try {
  //     // Verify the JWT access token
  //     const decodedToken = await this.jwtService.verifyAsync(token, {
  //       secret: ACCESS_AUTH, // Use access token secret for validation
  //     });

  //     // The payload is encrypted, so decrypt it
  //     const decryptedPayload = this.decryptPayload(decodedToken.data);

  //     // Return the decrypted payload, which contains user info
  //     return decryptedPayload;
  //   } catch (error) {
  //     // Handle token expiration or invalid token
  //     if (error.name === 'TokenExpiredError') {
  //       throw new NotAcceptableException('Access token has expired');
  //     } else if (error.name === 'JsonWebTokenError') {
  //       throw new NotAcceptableException('Invalid access token');
  //     } else {
  //       throw new NotAcceptableException(error.message);
  //     }
  //   }
  // }

  // async setTxnPin(setTxnPin: SetTxnPinDto) {
  //   // only set this when user is already logged in. The session should still be active
  //   // also only set when user has answer some security questions.

  //   const { txn_pin, session_token } = setTxnPin;
  //   const { username } = await this.validateToken(session_token);

  //   let user: UserAccount;
  //   let u_user: UserAccount;
  //   if (username) {
  //     user = await this.getUserWithUsername(username);
  //   }

  //   // check if user has security questions and answer them.
  //   const queryRunner = this.connection.createQueryRunner();
  //   await queryRunner.connect();

  //   const user_security_ques = await queryRunner.manager.find(
  //     UserSecurityQuestion,
  //     { user_id: user.id },
  //   );

  //   if (user_security_ques.length < 1) {
  //     throw new NotAcceptableException(
  //       'Security Questions Not Yet Set. Please First Set Your Security Questions To Continue',
  //     );
  //   }

  //   await queryRunner.release();

  //   if (user.txn_pin == null || user.txn_pin == '') {
  //     u_user = await this.updateTxnPin(user, txn_pin);
  //   } else {
  //     throw new NotAcceptableException(
  //       'Transaction Pin Already Set. Request For Reset Instead',
  //     );
  //   }

  //   return u_user;
  // }

  // async resolveGoeCode(long: string, lat: string) {
  //   // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   const NodeGeocoder = require('node-geocoder');

  //   const options = {
  //     provider: 'google', //'google',
  //     httpAdapter: 'https', // Default
  //     apiKey: 'e9f4cdbbd020449fb7403cc22aa2d21d', // for Mapquest, OpenCage, Google Premier
  //     formatter: 'json', // 'gpx', 'string', ...
  //   };

  //   const geocoder = NodeGeocoder(options);
  //   let user_location = ''; // to fill in

  //   await geocoder.reverse({ lat: lat, lon: long }, function (err, res) {
  //     user_location = res;
  //   });

  //   console.log('user_location', user_location);
  //   return user_location;
  // }

  // async validateTxnPin(loginWithTempPin: LoginWithhTempPinDto) {
  //   const { device_hash, pin } = loginWithTempPin;
  //   const user = await this.validateUserWithTempPin(device_hash, pin);
  //   const payload = { username: user.email, sub: user.userId };
  //   return {
  //     access_token: this.jwtService.sign(payload),
  //   };
  // }
}
