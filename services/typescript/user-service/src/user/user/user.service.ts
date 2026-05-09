import {
  forwardRef,
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, Between, Like, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { AbstractService } from '../../common/abstract.service';
import { UserAccount, UserAccountStatus } from './entities/user.entity';
import { ConsentAuditLog } from './entities/consent-audit-log.entity';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { OwnerDocsService } from '../owner-docs/owner-docs.service';
import { EnvService } from 'src/common/env.service';
import { UpgreadeUserKYCDto } from './dto/upgrade-user-kyc.dto';
import { KycLevelsService } from 'src/kyc-levels/kyc-levels.service';
import {
  OwnerDoc,
  OwnerDocsVerificationStatus,
} from '../owner-docs/entities/owner-doc.entity';
import { paginatedResult } from 'src/common/paginated-result.interface';
import { ResetTxnPinDto } from '../auth/dto/reset-txn-pin.dto';
import { UserSecurityQuestion } from 'src/user-security-questions/entities/user-security-question.entity';
import { PasswordResetDto } from '../auth/dto/reset-password.dto';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import { CbaInteractionsService } from 'src/cba-interactions/cba-interactions.service';
import { UserType } from 'src/admin/admin/entities/admin.entity';
import { JwtAuthUtilsService } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { Update2FAStatusDto } from './dto/update-2fa-status.dto';
import { LoginHistory } from '../login-history/entities/login-history.entity';
import { Device } from '../device-details/entities/device-details.entity';
import { MMFInvestmentRequest } from '../investment-request/entities/investment-request.entity';
import { FundRedemptionMMFRequest } from '../investment-request/entities/redemption-request.entity';
import { CanaryInvestmentRequest } from '../investment-request-canary/entities/investment-request-canary.entity';
import { FundRedemptionCanaryRequest } from '../investment-request-canary/entities/redemption-canary-request.entity';
import { UserInvestmentPool } from '../investment-pull/entities/investment-pull.entity';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { IncomeInvestmentRequest } from '../investment-request-income/entities/investment-request-income.entity';
import { FundRedemptionIncomeRequest } from '../investment-request-income/entities/redemption-income-request.entity';

const env_config = new EnvService().read();
const ACCT_BASE_URL = env_config.ACCT_BASE_URL;
const NOTN_BASE_URL = env_config.NOTN_BASE_URL;
const REFRESH_AUTH = env_config.REFRESH_AUTH;
const currency = 'NG';

// AWS S3 config
const AWS_REGION = env_config.AWS_REGION;
const AWS_ACCESS_KEY_ID = env_config.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env_config.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = env_config.S3_BUCKET_NAME;
const SIGNED_URL_EXPIRATION = Number(env_config.SIGNED_URL_EXPIRATION || 900);

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

@Injectable()
export class UserService extends AbstractService {
  constructor(
    @InjectRepository(UserAccount)
    private readonly userAccountRepository: Repository<UserAccount>,

    @Inject(forwardRef(() => OwnerDocsService))
    private readonly ownerDocsService: OwnerDocsService,

    private readonly kycLevelsService: KycLevelsService,
    private readonly connection: Connection,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly cbaInteractionsService: CbaInteractionsService,
    private readonly jwtAuthUtilsService: JwtAuthUtilsService,
  ) {
    super(userAccountRepository);
  }

  /* -------------------------- User Management -------------------------- */

  async findAllUsers(
    page = 1,
    per_page = 15,
    query: any = {},
  ): Promise<paginatedResult> {
    const take = per_page || 15;
    const skip = (page - 1) * take;

    const { search, startDate, endDate, account_status, phone } = query;

    // Base conditions that apply to everything
    const baseConditions: any = {};
    if (account_status) {
      baseConditions.account_status = account_status;
    }

    // Date Range
    if (startDate && endDate) {
      const { start_date, end_date } = await this.getDateRange(
        startDate,
        endDate,
      );
      baseConditions.created_at = Between(start_date, end_date);
    }

    let where: any;
    if (search) {
      where = [
        { ...baseConditions, first_name: Like(`%${search}%`) },
        { ...baseConditions, last_name: Like(`%${search}%`) },
        { ...baseConditions, email: Like(`%${search}%`) },
        { ...baseConditions, phone: Like(`%${search}%`) },
      ];

      // However, we need to make sure the phone filter from registration status is preserved
      // in the first 3 objects of the 'where' array if it was present.
      if (phone === 'phone') {
        where[0].phone = Not(IsNull());
        where[1].phone = Not(IsNull());
        where[2].phone = Not(IsNull());
        // For where[3] (phone search), it already has 'phone' key, so we leave it as Like.
      } else if (phone === 'null') {
        where[0].phone = IsNull();
        where[1].phone = IsNull();
        where[2].phone = IsNull();
        // For where[3], if search is provided, we probably want to find the user by phone
        // even if they were "incomplete".
      }
    } else {
      where = { ...baseConditions };
      if (phone === 'phone') {
        where.phone = Not(IsNull());
      } else if (phone === 'null') {
        where.phone = IsNull();
      }
    }

    const [data, total] = await this.userAccountRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take,
      skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async createUserWallet(user: UserAccount, client_ip: string): Promise<any> {
    const data_to_post = {
      user_id: user.id,
      email: user.email,
      wallet_ref: user.user_txn_ref,
      phonenumber: user.phone,
      firstname: user.first_name,
      lastname: user.last_name,
      currency,
    };

    const refresh_token = await this.signTempRefreshTokens(user, client_ip);

    const user_wallet = await this.externalApiCallsService.postData(
      `${ACCT_BASE_URL}/accounts/wallet`,
      data_to_post,
      refresh_token,
    );

    if (!user_wallet)
      throw new NotImplementedException(
        'User Wallet Could Not Be Created. An Error Occured',
      );

    return user_wallet;
  }

  async upgradeUserKYC(upgreadeUserKYCDto: UpgreadeUserKYCDto) {
    const { user_id, level_number } = upgreadeUserKYCDto;
    const user = await this.findUserById(user_id);
    const kyc_level = await this.getKycLevel(level_number);

    return this.update(user.id, { kyc_level: { id: kyc_level.id } });
  }

  async createUserDocsRecord(user: UserAccount): Promise<any> {
    const user_docs = await this.ownerDocsService.create({
      user_id: user.id,
      full_name: `${user.first_name} ${user.last_name}`,
    });

    if (!user_docs) console.log('User Docs Record Not Created');
    return user_docs;
  }

  async sendUserAuthNotifications(data: any): Promise<any> {
    const user_notn = await this.postData(
      `${NOTN_BASE_URL}/notifications/send`,
      data,
    );

    if (!user_notn)
      throw new NotImplementedException(
        'User Notification Could Not Be Sent. An Error Occured',
      );

    return user_notn.data;
  }

  async postData(url: string, data: any, token?: string) {
    return this.externalApiCallsService.postData(url, data, token);
  }

  async hashTxnPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 14);
  }

  async validatePinLength(pin: number) {
    const pin_string = pin.toString();
    if (pin_string.length !== 4)
      throw new NotAcceptableException(
        'Transaction Pin Must Be Equal To 4 Digits',
      );
    return pin_string;
  }

  async findUserById(user_id: number): Promise<UserAccount> {
    return this.userAccountRepository.findOne({ where: { id: user_id } });
  }

  async getKycLevel(level_number: number) {
    return this.kycLevelsService.getKycLevel({ level_number });
  }

  async approveUserDocs(user_id: number) {
    const user = await this.findUserById(user_id);
    const user_docs = await this.findUserDocs(user_id);

    const u_user_docs = await this.ownerDocsService.update(user_docs.id, {
      owner_docs_verification_status: OwnerDocsVerificationStatus.VERIFIED,
    });

    if (!u_user_docs)
      throw new NotAcceptableException('User Docs Not Verified');

    return this.upgradeUserKYC({ user_id: user.id, level_number: 3 });
  }

  async findUserDocs(user_id: number) {
    return this.ownerDocsService.findOrCreateUserDocs(user_id, user_id);
  }

  async findOneUser(user_id: number) {
    let user = await this.findOne({ id: user_id }, ['kyc_level']);
    if (!user) throw new NotFoundException('User Not Found');

    const user_docs = await this.findUserDocs(user_id);
    user = await this.validateUploadedDocs(user, user_docs);

    const uuser = await this.deleteUserFields(user);

    console.log(`Initiating CBA NUBAN creation check for user: ${user.id}`);
    await this.cbaInteractionsService.createCBACustomerAccounts(user);

    return uuser;
  }

  async validateUploadedDocs(user: UserAccount, user_doc: OwnerDoc) {
    const hasIdentityDoc = !!user_doc.identification_doc_url?.trim();
    const hasAddressDoc = !!user_doc.proof_of_address_url?.trim();

    return {
      ...user,
      has_identity_documents: hasIdentityDoc,
      has_adress_documents: hasAddressDoc,
      documents_verified:
        hasIdentityDoc && hasAddressDoc
          ? user_doc.owner_docs_verification_status
          : OwnerDocsVerificationStatus.NOT_VERIFIED,
    };
  }

  /* -------------------------- Auth & Security -------------------------- */

  async updateTxnPin(user: UserAccount, txn_pin: number) {
    const pin = await this.validatePinLength(txn_pin);
    const hash = await this.hashTxnPin(pin);
    return this.update(user.id, { txn_pin: hash });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.findOne({ email });

    if (!user) throw new NotFoundException('Unrecognized User Details');
    if (user.account_status == UserAccountStatus.BLOCKED)
      throw new NotAcceptableException(
        'User Account Blocked. Please Contact Support',
      );

    const match = await this.bcryptCompare(pass, user.password);
    if (!match) throw new NotAcceptableException('Invalid Email or Password');

    if (user.account_status === 'LOCKED')
      throw new NotAcceptableException('Account Locked, Contact Support');

    if (user.account_status === 'BANNED')
      throw new NotAcceptableException('Account Banned, Contact Support');

    return user;
  }

  async bcryptCompare(passed: string, to_compare: string) {
    return bcrypt.compare(passed, to_compare);
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
      { id: question_id, user_id: user.id },
    );
    await queryRunner.release();

    if (!user_sec_que)
      throw new NotFoundException('No Matching Security Question For User');

    const trimmed_answer = answer.trim();
    const valid = await this.compareSecurityQueAnswer(
      trimmed_answer,
      user_sec_que.answer,
    );

    if (!valid)
      throw new NotAcceptableException('Invalid Answer To Security Question');
  }

  async compareSecurityQueAnswer(passed_answer: string, hashed_answer: string) {
    return this.bcryptCompare(passed_answer, hashed_answer);
  }

  async resetTxnPin(resetTxnPinDto: ResetTxnPinDto) {
    const { email, password, new_txn_pin } = resetTxnPinDto;
    const user = await this.validateUser(email, password);
    await this.ValidateUserSecurityQue(resetTxnPinDto, user);
    const u_user = await this.updateTxnPin(user, new_txn_pin);
    return this.deleteUserFields(u_user);
  }

  async resetPassword(passwordResetDto: PasswordResetDto) {
    const { email, old_password, new_password } = passwordResetDto;
    const user = await this.validateUser(email, old_password);
    const hash = await this.hashDetail(new_password);
    const update = await this.update(user.id, { password: hash });
    return this.deleteUserFields(update);
  }

  async hashDetail(field: string): Promise<string> {
    return bcrypt.hash(field, 12);
  }

  async deleteUserFields(user: UserAccount) {
    user.has_txn_pin = !!user.txn_pin;
    user.has_temp_login_pin = !!user.temp_login_pin;

    delete user.password;
    delete user.temp_login_pin;
    delete user.txn_pin;
    delete user.user_token;
    delete (user as any).bvn;
    return user;
  }

  async update2FAStatus(email: string, dto: Update2FAStatusDto) {
    let user = await this.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    user.is_2fa_enabled = dto.is_2fa_enabled;
    await this.update(user.id, user);

    const user_docs = await this.findUserDocs(user.id);
    user = await this.validateUploadedDocs(user, user_docs);
    const uuser = await this.deleteUserFields(user);

    return {
      message: `2FA has been ${dto.is_2fa_enabled ? 'enabled' : 'disabled'}.`,
      is_2fa_enabled: user.is_2fa_enabled,
      user: uuser,
    };
  }

  async updateAccountStatusToActive(email: string) {
    const user = await this.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    user.account_status = UserAccountStatus.ACTIVE;
    await this.update(user.id, user);

    return {
      message: 'Account status has been set to ACTIVE.',
      account_status: user.account_status,
      user,
    };
  }

  async signTempRefreshTokens(user: UserAccount, client_ip: string) {
    const payload = {
      user_id: user.id,
      user_ref: user.user_txn_ref,
      account: null,
      user_type: user.user_type,
      user_name: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      roles: UserType.USER,
      client_ip,
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        user.email,
        client_ip,
      ),
      jti: crypto.randomUUID(),
    };

    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);
    return this.jwtAuthUtilsService.jwTSign(encryptedPayload, REFRESH_AUTH);
  }

  /* -------------------------- AWS S3 Secure URLs -------------------------- */

  private validateS3Key(key: string) {
    if (!key || typeof key !== 'string')
      throw new NotAcceptableException('File key is required');
    if (key.startsWith('/'))
      throw new NotAcceptableException('Key must not start with a slash');
    if (key.includes('..'))
      throw new NotAcceptableException('Invalid key path');
  }

  async generateS3UploadUrl(
    user: UserAccount,
    fileName: string,
    contentType: string,
  ) {
    this.validateS3Key(fileName);
    const key = `users/${user.id}/${fileName}`;

    try {
      await s3Client.send(
        new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
      );
      throw new ConflictException('File already exists.');
    } catch (err: any) {
      if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
        throw new NotImplementedException('Error checking existing object.');
      }
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });

    return { uploadUrl: url, key, expiresIn: SIGNED_URL_EXPIRATION };
  }

  async generateS3DownloadUrl(user: UserAccount, key: string) {
    this.validateS3Key(key);
    if (!key.startsWith(`users/${user.id}/`))
      throw new NotAcceptableException('Access denied for this file');

    const command = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key });
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });

    return { downloadUrl: url, expiresIn: SIGNED_URL_EXPIRATION };
  }

  decryptPublicKey(publicKey: string): string {
    try {
      // get secret from EnvService
      const env_config = new EnvService().read();
      const secret = env_config.PUBLIC_KEY_SECRET;

      if (!secret) {
        throw new NotImplementedException('Decryption secret not configured');
      }

      const bytes = CryptoJS.AES.decrypt(publicKey, secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new NotAcceptableException('Invalid or malformed encrypted key');
      }

      return decrypted;
    } catch (error) {
      throw new NotAcceptableException('Error decrypting public key');
    }
  }

  async exportUserData(userId: number) {
    const user = await this.userAccountRepository.findOne({
      where: { id: userId },
      relations: ['kyc_level'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Filter out internal/hashed fields before export
    const { password, refresh_token, txn_pin, temp_login_pin, ...pii } = user;
    return pii;
  }

  async deleteUserAccount(userId: number) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(UserAccount, {
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      // Hard-delete all related records in dependency order (children first)
      // Using raw QueryBuilder to avoid TypeORM @ManyToOne relation resolver issues
      const qb = queryRunner.manager.createQueryBuilder();

      await qb
        .delete()
        .from(ConsentAuditLog)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(OwnerDoc)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(LoginHistory)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(Device)
        .where('userId = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(MMFInvestmentRequest)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(CanaryInvestmentRequest)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(IncomeInvestmentRequest)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(FundRedemptionMMFRequest)
        .where('user_identity = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(FundRedemptionCanaryRequest)
        .where('user_identity = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(FundRedemptionIncomeRequest)
        .where('user_identity = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(UserInvestmentPool)
        .where('user_id = :userId', { userId })
        .execute();
      await qb
        .delete()
        .from(VirtualWallet)
        .where('user_id = :userId', { userId })
        .execute();

      // Finally, hard-delete the UserAccount row itself
      await qb
        .delete()
        .from(UserAccount)
        .where('id = :userId', { userId })
        .execute();

      // Call Accounts-Service to delete user wallet and BVN (remote cleanup)
      try {
        await this.externalApiCallsService.postData(
          `${ACCT_BASE_URL}/wallet/delete/user/${userId}`,
          {},
        );
      } catch (acctErr) {
        console.error(
          `Failed to delete user wallet in Accounts-Service: ${acctErr.message}`,
        );
        // We continue anyway since the main account is already scheduled for deletion,
        // but this log helps track synchronization issues.
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message:
          'User account and all related records have been permanently deleted.',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Failed to complete account deletion: ${err.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateConsent(userId: number, dto: UpdateConsentDto) {
    const user = await this.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update User Account
      await queryRunner.manager.update(UserAccount, userId, {
        terms_accepted: dto.terms_accepted,
        privacy_policy_accepted: dto.privacy_policy_accepted,
        marketing_consent: dto.marketing_consent,
        consent_timestamp: new Date(),
        policy_version: dto.policy_version,
      });

      // 2. Create Consent Audit Log
      const consentLog = new ConsentAuditLog();
      consentLog.user_id = userId;
      consentLog.terms_accepted = dto.terms_accepted;
      consentLog.privacy_policy_accepted = dto.privacy_policy_accepted;
      consentLog.marketing_consent = dto.marketing_consent || false;
      consentLog.policy_version = dto.policy_version;
      consentLog.ip_address = dto.ip_address;
      consentLog.user_agent = dto.user_agent;
      await queryRunner.manager.save(ConsentAuditLog, consentLog);

      await queryRunner.commitTransaction();
      return { success: true, message: 'Consent updated successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Failed to update consent');
    } finally {
      await queryRunner.release();
    }
  }
}
