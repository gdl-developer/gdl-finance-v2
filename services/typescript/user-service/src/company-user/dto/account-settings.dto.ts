import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsEmail,
  IsArray,
  Min,
  Max,
  IsDecimal,
  IsNotEmpty,
} from 'class-validator';
import {
  NotificationPreference,
  Theme,
} from '../entities/company-user-account-settings.entity';

export class UpdateAccountSettingsDto {
  // Security Settings
  @ApiProperty({ description: 'Enable login notifications', required: false })
  @IsBoolean()
  @IsOptional()
  loginNotifications?: boolean;

  @ApiProperty({
    description: 'Enable transaction notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  transactionNotifications?: boolean;

  @ApiProperty({
    description: 'Enable password change notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  passwordChangeNotifications?: boolean;

  @ApiProperty({
    description: 'Enable account locked notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  accountLockedNotifications?: boolean;

  @ApiProperty({ description: 'Require 2FA for transactions', required: false })
  @IsBoolean()
  @IsOptional()
  requireTwoFactorForTransactions?: boolean;

  @ApiProperty({
    description: 'Session timeout in minutes',
    required: false,
    minimum: 5,
    maximum: 480,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutes?: number;

  // Notification Preferences
  @ApiProperty({
    description: 'Login notification preference',
    enum: NotificationPreference,
    required: false,
  })
  @IsEnum(NotificationPreference)
  @IsOptional()
  loginNotificationPreference?: NotificationPreference;

  @ApiProperty({
    description: 'Transaction notification preference',
    enum: NotificationPreference,
    required: false,
  })
  @IsEnum(NotificationPreference)
  @IsOptional()
  transactionNotificationPreference?: NotificationPreference;

  @ApiProperty({
    description: 'Security notification preference',
    enum: NotificationPreference,
    required: false,
  })
  @IsEnum(NotificationPreference)
  @IsOptional()
  securityNotificationPreference?: NotificationPreference;

  // UI Preferences
  @ApiProperty({
    description: 'UI theme preference',
    enum: Theme,
    required: false,
  })
  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;

  @ApiProperty({ description: 'Language preference', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'Timezone preference', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ description: 'Preferred currency', required: false })
  @IsString()
  @IsOptional()
  preferredCurrency?: string;

  // Privacy Settings
  @ApiProperty({
    description: 'Show profile picture to others',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showProfilePicture?: boolean;

  @ApiProperty({
    description: 'Allow data collection for analytics',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allowDataCollection?: boolean;

  @ApiProperty({ description: 'Allow marketing emails', required: false })
  @IsBoolean()
  @IsOptional()
  allowMarketingEmails?: boolean;

  // Transaction Limits
  @ApiProperty({ description: 'Daily transaction limit', required: false })
  @IsNumber()
  @IsOptional()
  dailyTransactionLimit?: number;

  @ApiProperty({ description: 'Monthly transaction limit', required: false })
  @IsNumber()
  @IsOptional()
  monthlyTransactionLimit?: number;

  @ApiProperty({ description: 'Maximum daily transactions', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  maxDailyTransactions?: number;

  // Backup and Recovery
  @ApiProperty({ description: 'Recovery email address', required: false })
  @IsEmail()
  @IsOptional()
  recoveryEmail?: string;

  @ApiProperty({ description: 'Recovery phone number', required: false })
  @IsString()
  @IsOptional()
  recoveryPhone?: string;
}

export class UpdateProfilePictureDto {
  @ApiProperty({ description: 'Profile picture URL or base64 encoded image' })
  @IsString()
  @IsNotEmpty()
  profilePicture: string;
}
