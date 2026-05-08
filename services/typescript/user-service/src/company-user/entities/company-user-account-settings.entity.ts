import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyUser } from './company-user.entity';

export enum NotificationPreference {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  BOTH = 'BOTH',
  NONE = 'NONE',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  AUTO = 'AUTO',
}

@Entity('company_user_account_settings')
export class CompanyUserAccountSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => CompanyUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyUserId' })
  companyUser: CompanyUser;

  // Security Settings
  @Column({ type: 'boolean', default: true })
  loginNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  transactionNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  passwordChangeNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  accountLockedNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  requireTwoFactorForTransactions: boolean;

  @Column({ type: 'integer', default: 30 })
  sessionTimeoutMinutes: number;

  // Notification Preferences
  @Column({
    type: 'enum',
    enum: NotificationPreference,
    default: NotificationPreference.EMAIL,
  })
  loginNotificationPreference: NotificationPreference;

  @Column({
    type: 'enum',
    enum: NotificationPreference,
    default: NotificationPreference.EMAIL,
  })
  transactionNotificationPreference: NotificationPreference;

  @Column({
    type: 'enum',
    enum: NotificationPreference,
    default: NotificationPreference.EMAIL,
  })
  securityNotificationPreference: NotificationPreference;

  // UI Preferences
  @Column({ type: 'enum', enum: Theme, default: Theme.LIGHT })
  theme: Theme;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  preferredCurrency: string;

  // Privacy Settings
  @Column({ type: 'boolean', default: true })
  showProfilePicture: boolean;

  @Column({ type: 'boolean', default: false })
  allowDataCollection: boolean;

  @Column({ type: 'boolean', default: true })
  allowMarketingEmails: boolean;

  // Transaction Limits
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  dailyTransactionLimit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monthlyTransactionLimit: number;

  @Column({ type: 'integer', default: 10 })
  maxDailyTransactions: number;

  // Backup and Recovery
  @Column({ type: 'json', nullable: true })
  backupCodes: string[];

  @Column({ type: 'varchar', nullable: true })
  recoveryEmail: string;

  @Column({ type: 'varchar', nullable: true })
  recoveryPhone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
