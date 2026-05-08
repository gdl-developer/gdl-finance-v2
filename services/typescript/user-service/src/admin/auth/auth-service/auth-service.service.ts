import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { AdminService } from '../../admin/admin.service';
import { ValidateTokenDto } from 'src/user/auth/dto/validate-token.dto';
import { AdminLoginDto } from '../dto/login.dto';
import { Admin } from 'src/admin/admin/entities/admin.entity';
import { auth_actions_html } from 'src/common/utils/notification-templates/auth-actions-helper';
import { ForgotPasswordDto } from 'src/user/auth/dto/forgot-password.dto';
import { AdminAuthActions, AuthRequestType } from '../entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateNewPasswordDto } from 'src/user/auth/dto/create-new-password.dto';
import { TokenVerifyActionDto } from 'src/user/auth/dto/forgot-password-action.dto';
import { JwtAuthUtilsService } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { EnvService } from 'src/common/env.service';

const expiresIn = '2h';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminAuthActions)
    private authActionsRepository: Repository<AdminAuthActions>,
    private adminService: AdminService,
    private readonly jwtAuthUtilsService: JwtAuthUtilsService,
    private envService: EnvService,
  ) {}

  async login(adminLoginDto: AdminLoginDto, client_ip: string) {
    const { email, password } = adminLoginDto;
    const user = await this.adminService.validateUser(email, password);

    if (user === null)
      throw new NotFoundException('Opps!, Incorrect Login Details');

    const { refresh_token, access_token } = await this.signJwt(user, client_ip);

    if (user.activationStatus === false) {
      return {
        message: 'Your First Time Login? Please Reset Your Password',
        access_token: null,
        refresh_token,
        expiresIn: expiresIn,
      };
    }

    return {
      mesage: null,
      access_token: access_token,
      refresh_token: refresh_token,
      expiresIn: expiresIn,
    };
  }

  async validateUser(adminLoginDto: AdminLoginDto) {
    const { email, password } = adminLoginDto;
    const user = await this.adminService.validateUser(email, password);

    if (user === null) {
      throw new NotFoundException('User could not be validated');
    } else if (user) {
      return true;
    }
  }

  async signJwt(user: Admin, client_ip: string) {
    // Create a payload
    // const payload = { username: user.staffEmail, sub: user.staffId };

    const payload = {
      username: user.staffEmail,
      user_id: user.staffId,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.staffEmail,
        client_ip,
      ), // Add fingerprint to prevent token replay
      jti: crypto.randomUUID(), // Unique token identifier for replay protection
    };

    // Encrypt the payload before signing it
    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    // Sign JWT with encrypted payload
    const access_token = await this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      this.envService.read().ADMIN_ACCESS_AUTH,
      expiresIn,
    );

    // Get refresh tokens
    const refresh_token = await this.signRefreshTokens(user, client_ip);
    return { access_token, refresh_token };
  }

  async signRefreshTokens(admin: Admin, client_ip: string) {
    const payload = {
      user_id: admin.staffId,
      user_type: admin.user_type,
      user_name: `${admin.staffFirstName} ${admin.staffLastName}`,
      roles: admin.roles.id,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        admin.staffEmail,
        client_ip,
      ), // Bind refresh token to the client fingerprint
      jti: crypto.randomUUID(), // Unique identifier for replay prevention
    };

    // Encrypt the payload before signing it
    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    // Sign refresh token with encrypted payload
    const refresh_token = this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      this.envService.read().REFRESH_AUTH,
      expiresIn,
    );

    return refresh_token;
  }

  async getUserAfterTokenVerify(
    validateTokenDto: ValidateTokenDto,
    client_ip: string,
  ) {
    const { token } = validateTokenDto;
    const user = await this.jwtAuthUtilsService.validateToken(
      token,
      client_ip,
      false,
      this.envService.read().ADMIN_ACCESS_AUTH,
    );

    let fetched_user: any;
    if (user) {
      fetched_user = await this.getUserWithUsername(user.username);

      // update last login
      await this.adminService.updateLastLogin(
        fetched_user.staffId,
        new Date().toISOString(),
      );
    }

    // fetched_user.refresh_token = await this.signRefreshTokens(
    //   fetched_user,
    //   client_ip,
    // );

    delete fetched_user.createdAt;
    delete fetched_user.updatedAt;
    delete fetched_user.roles.createdAt;
    delete fetched_user.roles.updatedAt;

    return fetched_user;
  }

  async getUserWithUsername(username: string) {
    const user: Admin = await this.adminService.findOne(
      { staffEmail: username },
      ['roles'],
    );

    if (!user) throw new NotFoundException('User Not Found');

    if (user.account_status == 'LOCKED' || user.account_status == 'BLOCKED')
      throw new NotAcceptableException('Account Locked, Contact Support');

    if (user.account_status == 'BANNED')
      throw new NotAcceptableException('Account Banned, Contact Support');

    delete user.password;

    return user;
  }

  async deleteAdminFields(admin: Admin) {
    delete admin.password;

    return admin;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.adminService.findOne({
      staffEmail: forgotPasswordDto.email,
    });

    if (!user) throw new NotFoundException('User Not Found');

    const user_id = user.staffId;

    const message1 = `You’ve received this message because you indicated that you forgot your password. Please use the OTP below to reset your password.`;
    const message2 = `If you did not make this request, please disregard this email, and your password will not be changed.`;

    const { FRONT_END_BASE_URL, TEST_ADMIN_FRONTEND } = this.envService.read();
    const testAdminFrontend = TEST_ADMIN_FRONTEND || FRONT_END_BASE_URL;

    const request_token = await this.genAuthActionToken();
    const request_otp = await this.genAuthActionOtp();
    const data = {
      heading_logo: ``,
      heading: `Reset Your Password`,
      message1: message1,
      message2: message2,
      message3: ``,
      request_otp: request_otp,
      url: `${testAdminFrontend}/auth/verify-email`,
      type: AuthRequestType.PASSWORD_RESET,
    };

    const html = auth_actions_html(data);
    const request_ref = await this.genNotificationRef();

    const password_reset_notfn = {
      sender: 'GDL',
      title: 'Password Reset',
      description: 'Reset Your Password',
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: user_id,
      recipients_email: forgotPasswordDto.email,
      recipients_phone_number: 'null',
      request_ref: `PASSRESET_${request_ref}`, // generate
      message: `${message1} ${message2}`,
      html: null,
      complete_html_body: html,
      show_advert: false,
      purpose: 'register',
    };

    const auth_action_data = {
      notification_data: password_reset_notfn,
      user_id: user_id,
      request_type: AuthRequestType.PASSWORD_RESET,
      request_token: `${request_token}`,
      request_otp: `${request_otp}`,
      email: forgotPasswordDto.email,
    };

    console.log('auth_action_data', auth_action_data);

    const auth_action = await this.authActionNotification(auth_action_data);
    return auth_action.request_token;
  }

  async authActionNotification(data: any): Promise<any> {
    await this.adminService.sendUserNotification(data.notification_data);

    // Set expiration to 5 mins from now
    const expires_at = new Date();
    expires_at.setMinutes(expires_at.getMinutes() + 5);

    const auth_action = await this.authActionsRepository.save({
      user_id: data.user_id,
      request_type: data.request_type,
      request_token: `${data.request_token}`,
      request_otp: `${data.request_otp}`,
      email: data.email,
      expires_at: expires_at,
    });

    if (!auth_action)
      throw new NotImplementedException('Auth Action Not Saved');

    console.log('Auth action saved');
    return auth_action;
  }

  async genAuthActionToken(): Promise<number> {
    return Math.floor(Math.random() * 100233 + 100881);
  }

  async genAuthActionOtp(): Promise<number> {
    return Math.floor(Math.random() * 100555 + 100666);
  }

  async genNotificationRef(): Promise<number> {
    return Math.floor(Math.random() * 1000000883 + 1000000441);
  }

  async tokenVerifyAction(tokenVerifyActionDto: TokenVerifyActionDto) {
    const auth_action = await this.authActionsRepository.findOne({
      ...tokenVerifyActionDto,
    });

    if (!auth_action) throw new NotFoundException('Invalid OTP');

    if (
      auth_action.request_otp !== tokenVerifyActionDto.request_otp ||
      auth_action.request_token !== tokenVerifyActionDto.request_token
    )
      throw new NotAcceptableException('Tokens do not Match');

    return auth_action;
  }

  async createNewPassword(createNewPasswordDto: CreateNewPasswordDto | any) {
    const { email, new_password, otp, request_token, request_otp } =
      createNewPasswordDto;

    await this.tokenVerifyAction({
      email: email,
      request_otp: otp || request_otp,
      request_token: request_token,
    });

    const user = await this.adminService.findOne({
      staffEmail: email,
    });

    const hash = await this.hashPassword(new_password);
    const update = await this.adminService.updateAdmin(
      { staffId: user.staffId },
      {
        password: hash,
      },
    );

    const uuser = await this.adminService.deleteAdminFields(update);

    return uuser;
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }
}
