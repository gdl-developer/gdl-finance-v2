import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import {
  CompanyUser,
  CompanyUserRole,
  CompanyUserStatus,
} from './entities/company-user.entity';
import {
  CompanyUserAuthAction,
  AuthActionType,
} from './entities/company-user-auth-action.entity';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyUserLoginDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
  CreateNewPasswordDto,
} from './dto/reset-password.dto';
import {
  SetTransactionPinDto,
  ValidateTransactionPinDto,
  ResetTransactionPinDto,
} from './dto/transaction-pin.dto';
import { Company_profile } from '../admin/company/entities/company.entity';

@Injectable()
export class CompanyUserService {
  constructor(
    @InjectRepository(CompanyUser)
    private companyUserRepository: Repository<CompanyUser>,
    @InjectRepository(CompanyUserAuthAction)
    private authActionRepository: Repository<CompanyUserAuthAction>,
    @InjectRepository(Company_profile)
    private companyRepository: Repository<Company_profile>,
    private jwtService: JwtService,
    private connection: Connection,
  ) {}

  async create(
    companyId: string,
    createCompanyUserDto: CreateCompanyUserDto,
  ): Promise<CompanyUser> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.validateEmailAndPhone(
        createCompanyUserDto.email,
        createCompanyUserDto.phone,
      );

      // Find company
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Generate a temporary password
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await this.hashPassword(tempPassword);

      // Create the user
      const newUser = queryRunner.manager.create(CompanyUser, {
        firstName: createCompanyUserDto.firstName,
        lastName: createCompanyUserDto.lastName,
        middleName: createCompanyUserDto.middleName,
        email: createCompanyUserDto.email,
        phone: createCompanyUserDto.phone,
        password: hashedPassword,
        role: createCompanyUserDto.role,
        approvalLevel: createCompanyUserDto.approvalLevel,
        // position: createCompanyUserDto.position,
        // department: createCompanyUserDto.department,
        company: company,
        status: CompanyUserStatus.PENDING,
        forcePasswordChange: true,
      });

      const savedUser = await queryRunner.manager.save(CompanyUser, newUser);

      // Send verification email
      const { requestToken, requestOtp } = await this.createAuthAction(
        savedUser,
        AuthActionType.EMAIL_VERIFICATION,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Todo: Send email with temporary password and verification link
      console.log(`Temporary password for ${savedUser.email}: ${tempPassword}`);
      console.log(`Verification OTP: ${requestOtp}, Token: ${requestToken}`);

      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(companyId?: string): Promise<CompanyUser[]> {
    const query = this.companyUserRepository
      .createQueryBuilder('companyUser')
      .leftJoinAndSelect('companyUser.company', 'company');

    if (companyId) {
      query.where('company.id = :companyId', { companyId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<CompanyUser> {
    const user = await this.companyUserRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException('Company user not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<CompanyUser> {
    const user = await this.companyUserRepository.findOne({
      where: { email },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException('Company user not found');
    }

    return user;
  }

  async update(
    id: string,
    updateCompanyUserDto: UpdateCompanyUserDto,
  ): Promise<CompanyUser> {
    const user = await this.findOne(id);

    // If email is being updated, check for uniqueness
    if (
      updateCompanyUserDto.email &&
      updateCompanyUserDto.email !== user.email
    ) {
      const existingUser = await this.companyUserRepository.findOne({
        where: { email: updateCompanyUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    // If phone is being updated, check for uniqueness
    if (
      updateCompanyUserDto.phone &&
      updateCompanyUserDto.phone !== user.phone
    ) {
      const existingUser = await this.companyUserRepository.findOne({
        where: { phone: updateCompanyUserDto.phone },
      });
      if (existingUser) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    // Update user
    Object.assign(user, updateCompanyUserDto);
    return this.companyUserRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.status = CompanyUserStatus.INACTIVE;
    await this.companyUserRepository.save(user);
  }

  async login(loginDto: CompanyUserLoginDto, clientIp: string): Promise<any> {
    const user = await this.companyUserRepository.findOne({
      where: { email: loginDto.email },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (
      user.isAccountLocked &&
      user.accountLockedUntil &&
      new Date() < user.accountLockedUntil
    ) {
      const remainingTime = Math.ceil(
        (user.accountLockedUntil.getTime() - new Date().getTime()) /
          (1000 * 60),
      );
      throw new UnauthorizedException(
        `Account is locked. Please try again in ${remainingTime} minutes.`,
      );
    }

    // Unlock account if lock period has expired
    if (
      user.isAccountLocked &&
      user.accountLockedUntil &&
      new Date() >= user.accountLockedUntil
    ) {
      user.isAccountLocked = false;
      user.accountLockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.companyUserRepository.save(user);
    }

    if (
      user.status === CompanyUserStatus.INACTIVE ||
      user.status === CompanyUserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException(
        'Your account is not active. Please contact your administrator.',
      );
    }

    const isPasswordValid = await this.comparePasswords(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      user.lastFailedLoginAttempt = new Date();

      // Lock account after 3 failed attempts for 30 minutes
      if (user.failedLoginAttempts >= 3) {
        user.isAccountLocked = true;
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await this.companyUserRepository.save(user);
        throw new UnauthorizedException(
          'Account locked due to too many failed login attempts. Please try again in 30 minutes.',
        );
      }

      await this.companyUserRepository.save(user);
      const attemptsRemaining = 3 - user.failedLoginAttempts;
      throw new UnauthorizedException(
        `Invalid credentials. ${attemptsRemaining} attempts remaining before account lockout.`,
      );
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAttempt = null;
    user.isAccountLocked = false;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    user.deviceHash = loginDto.deviceHash;
    await this.companyUserRepository.save(user);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      clientIp,
    );

    // Store refresh token
    user.refreshToken = refreshToken;
    await this.companyUserRepository.save(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      forcePasswordChange: user.forcePasswordChange,
      twoFactorRequired: user.twoFactorEnabled,
    };
  }

  async verifyEmail(verifyOtpDto: VerifyOtpDto): Promise<CompanyUser> {
    const authAction = await this.authActionRepository.findOne({
      where: {
        email: verifyOtpDto.email,
        requestOtp: verifyOtpDto.otp,
        requestToken: verifyOtpDto.requestToken,
        actionType: AuthActionType.EMAIL_VERIFICATION,
        isUsed: false,
      },
      relations: ['companyUser'],
    });

    if (!authAction) {
      throw new BadRequestException('Invalid verification code or token');
    }

    if (new Date() > authAction.expiresAt) {
      throw new BadRequestException('Verification code has expired');
    }

    // Mark action as used
    authAction.isUsed = true;
    authAction.usedAt = new Date();
    await this.authActionRepository.save(authAction);

    // Update user
    const user = authAction.companyUser;
    user.emailVerified = true;
    if (user.status === CompanyUserStatus.PENDING) {
      user.status = CompanyUserStatus.ACTIVE;
    }
    return this.companyUserRepository.save(user);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ requestToken: string }> {
    const user = await this.companyUserRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Return fake token to prevent email enumeration
      return { requestToken: this.generateToken() };
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { requestToken, requestOtp } = await this.createAuthAction(
        user,
        AuthActionType.PASSWORD_RESET,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Todo: Send email with OTP
      console.log(`Password reset OTP: ${requestOtp}, Token: ${requestToken}`);

      return { requestToken };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createNewPassword(
    createNewPasswordDto: CreateNewPasswordDto,
  ): Promise<CompanyUser> {
    const authAction = await this.authActionRepository.findOne({
      where: {
        email: createNewPasswordDto.email,
        requestOtp: createNewPasswordDto.otp,
        requestToken: createNewPasswordDto.requestToken,
        actionType: AuthActionType.PASSWORD_RESET,
        isUsed: false,
      },
      relations: ['companyUser'],
    });

    if (!authAction) {
      throw new BadRequestException('Invalid reset code or token');
    }

    if (new Date() > authAction.expiresAt) {
      throw new BadRequestException('Reset code has expired');
    }

    // Mark action as used
    authAction.isUsed = true;
    authAction.usedAt = new Date();
    await this.authActionRepository.save(authAction);

    // Update user password
    const user = authAction.companyUser;
    user.password = await this.hashPassword(createNewPasswordDto.newPassword);
    user.lastPasswordChange = new Date();
    user.forcePasswordChange = false;
    return this.companyUserRepository.save(user);
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    userId: string,
  ): Promise<CompanyUser> {
    const user = await this.findOne(userId);

    if (user.email !== resetPasswordDto.email) {
      throw new UnauthorizedException('You can only reset your own password');
    }

    const isPasswordValid = await this.comparePasswords(
      resetPasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await this.hashPassword(resetPasswordDto.newPassword);
    user.lastPasswordChange = new Date();
    user.forcePasswordChange = false;
    return this.companyUserRepository.save(user);
  }

  // Transaction PIN methods
  async setTransactionPin(
    setTransactionPinDto: SetTransactionPinDto,
    userId: string,
  ): Promise<CompanyUser> {
    const user = await this.findOne(userId);

    // Hash the PIN
    const pinString = setTransactionPinDto.pin.toString();
    const hashedPin = await this.hashPassword(pinString);

    user.transactionPin = hashedPin;
    user.hasTransactionPin = true;
    return this.companyUserRepository.save(user);
  }

  async validateTransactionPin(
    validatePinDto: ValidateTransactionPinDto,
    userId: string,
  ): Promise<boolean> {
    const user = await this.findOne(userId);

    if (!user.hasTransactionPin) {
      throw new BadRequestException('Transaction PIN not set');
    }

    const pinString = validatePinDto.pin.toString();
    return this.comparePasswords(pinString, user.transactionPin);
  }

  async resetTransactionPin(
    resetPinDto: ResetTransactionPinDto,
    userId: string,
  ): Promise<CompanyUser> {
    const user = await this.findOne(userId);

    if (user.email !== resetPinDto.email) {
      throw new UnauthorizedException(
        'You can only reset your own transaction PIN',
      );
    }

    const isPasswordValid = await this.comparePasswords(
      resetPinDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Hash the new PIN
    const pinString = resetPinDto.newPin.toString();
    const hashedPin = await this.hashPassword(pinString);

    user.transactionPin = hashedPin;
    user.hasTransactionPin = true;
    return this.companyUserRepository.save(user);
  }

  // Helper methods
  private async validateEmailAndPhone(
    email: string,
    phone: string,
  ): Promise<void> {
    const existingEmail = await this.companyUserRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.companyUserRepository.findOne({
      where: { phone },
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-8);
  }

  private generateToken(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async createAuthAction(
    user: CompanyUser,
    actionType: AuthActionType,
    queryRunner?: any,
  ): Promise<{ requestToken: string; requestOtp: string }> {
    const requestToken = this.generateToken();
    const requestOtp = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    const authAction = queryRunner
      ? queryRunner.manager.create(CompanyUserAuthAction, {
          companyUser: user,
          email: user.email,
          actionType,
          requestToken,
          requestOtp,
          expiresAt,
        })
      : this.authActionRepository.create({
          companyUser: user,
          email: user.email,
          actionType,
          requestToken,
          requestOtp,
          expiresAt,
        });

    if (queryRunner) {
      await queryRunner.manager.save(CompanyUserAuthAction, authAction);
    } else {
      await this.authActionRepository.save(authAction);
    }

    return { requestToken, requestOtp };
  }

  private async generateTokens(
    user: CompanyUser,
    clientIp: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company.id,
      ip: clientIp,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: CompanyUser): any {
    const { password, transactionPin, refreshToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Fetch all users of a specific company
   */
  async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
    // 1️⃣ Validate company exists
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // 2️⃣ Fetch company users
    return this.companyUserRepository.find({
      where: { company: { id: companyId } },
      relations: ['company'], // in case you want company details along with users
    });
  }
}
