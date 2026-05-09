import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyUserAccountSettings } from './entities/company-user-account-settings.entity';
import { CompanyUser } from './entities/company-user.entity';
import {
  UpdateAccountSettingsDto,
  UpdateProfilePictureDto,
} from './dto/account-settings.dto';
import * as crypto from 'crypto';

@Injectable()
export class CompanyUserAccountSettingsService {
  constructor(
    @InjectRepository(CompanyUserAccountSettings)
    private readonly accountSettingsRepository: Repository<CompanyUserAccountSettings>,
    @InjectRepository(CompanyUser)
    private readonly companyUserRepository: Repository<CompanyUser>,
  ) {}

  async getAccountSettings(
    userId: string,
  ): Promise<CompanyUserAccountSettings> {
    let settings = await this.accountSettingsRepository.findOne({
      where: { companyUser: { id: userId } },
      relations: ['companyUser'],
    });

    if (!settings) {
      // Create default settings if they don't exist
      const user = await this.companyUserRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      settings = this.accountSettingsRepository.create({
        companyUser: user,
      });
      settings = await this.accountSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateAccountSettings(
    userId: string,
    updateDto: UpdateAccountSettingsDto,
  ): Promise<CompanyUserAccountSettings> {
    const settings = await this.getAccountSettings(userId);

    Object.assign(settings, updateDto);

    return this.accountSettingsRepository.save(settings);
  }

  async updateProfilePicture(
    userId: string,
    updateDto: UpdateProfilePictureDto,
  ): Promise<CompanyUser> {
    const user = await this.companyUserRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.profilePicture = updateDto.profilePicture;
    return this.companyUserRepository.save(user);
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const settings = await this.getAccountSettings(userId);

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    settings.backupCodes = backupCodes;
    await this.accountSettingsRepository.save(settings);

    return backupCodes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const settings = await this.getAccountSettings(userId);

    if (!settings.backupCodes || !settings.backupCodes.includes(code)) {
      return false;
    }

    // Remove the used backup code
    settings.backupCodes = settings.backupCodes.filter((c) => c !== code);
    await this.accountSettingsRepository.save(settings);

    return true;
  }

  async resetAccountSettings(
    userId: string,
  ): Promise<CompanyUserAccountSettings> {
    const settings = await this.getAccountSettings(userId);

    // Reset to default values
    const defaultSettings = this.accountSettingsRepository.create({
      companyUser: settings.companyUser,
    });

    // Keep the ID and timestamps
    defaultSettings.id = settings.id;
    defaultSettings.createdAt = settings.createdAt;

    return this.accountSettingsRepository.save(defaultSettings);
  }

  async getSecuritySummary(userId: string): Promise<any> {
    const user = await this.companyUserRepository.findOne({
      where: { id: userId },
    });
    const settings = await this.getAccountSettings(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      twoFactorEnabled: user.twoFactorEnabled,
      hasTransactionPin: user.hasTransactionPin,
      lastPasswordChange: user.lastPasswordChange,
      lastLogin: user.lastLogin,
      failedLoginAttempts: user.failedLoginAttempts,
      isAccountLocked: user.isAccountLocked,
      accountLockedUntil: user.accountLockedUntil,
      backupCodesCount: settings.backupCodes?.length || 0,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      requireTwoFactorForTransactions: settings.requireTwoFactorForTransactions,
    };
  }

  async getNotificationSettings(userId: string): Promise<any> {
    const settings = await this.getAccountSettings(userId);

    return {
      loginNotifications: settings.loginNotifications,
      transactionNotifications: settings.transactionNotifications,
      passwordChangeNotifications: settings.passwordChangeNotifications,
      accountLockedNotifications: settings.accountLockedNotifications,
      loginNotificationPreference: settings.loginNotificationPreference,
      transactionNotificationPreference:
        settings.transactionNotificationPreference,
      securityNotificationPreference: settings.securityNotificationPreference,
    };
  }

  async getUIPreferences(userId: string): Promise<any> {
    const settings = await this.getAccountSettings(userId);

    return {
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone,
      preferredCurrency: settings.preferredCurrency,
    };
  }

  async getTransactionLimits(userId: string): Promise<any> {
    const settings = await this.getAccountSettings(userId);

    return {
      dailyTransactionLimit: settings.dailyTransactionLimit,
      monthlyTransactionLimit: settings.monthlyTransactionLimit,
      maxDailyTransactions: settings.maxDailyTransactions,
    };
  }
}
