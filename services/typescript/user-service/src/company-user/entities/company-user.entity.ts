import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { Company_profile } from '../../admin/company/entities/company.entity';

export enum CompanyUserRole {
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  INITIATOR = 'INITIATOR',
  VIEWER = 'VIEWER',
}

export enum CompanyUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum ApprovalLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

@Entity('company_users')
@Unique(['email'])
@Unique(['phone'])
export class CompanyUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Exclude()
  @Column({ type: 'varchar', select: false })
  password: string;

  @Column({ type: 'enum', enum: CompanyUserRole })
  role: CompanyUserRole;

  @Column({
    type: 'enum',
    enum: CompanyUserStatus,
    default: CompanyUserStatus.PENDING,
  })
  status: CompanyUserStatus;

  @Column({ type: 'enum', enum: ApprovalLevel, nullable: true })
  approvalLevel: ApprovalLevel;

  @ManyToOne(() => Company_profile, { eager: true })
  @JoinColumn({ name: 'companyId' })
  company: Company_profile;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  hasTransactionPin: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  transactionPin: string;

  @Column({ type: 'date', nullable: true })
  lastPasswordChange: Date;

  @Column({ type: 'date', nullable: true })
  lastLogin: Date;

  @Exclude()
  @Column({ type: 'varchar', length: 50, nullable: true, select: false })
  deviceHash: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'boolean', default: false })
  forcePasswordChange: boolean;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  twoFactorSecret: string;

  @Column({ type: 'varchar', nullable: true })
  profilePicture: string;

  @Column({ type: 'datetime', nullable: true })
  accountLockedUntil: Date;

  @Column({ type: 'boolean', default: false })
  isAccountLocked: boolean;

  @Column({ type: 'json', nullable: true })
  accountSettings: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  lastFailedLoginAttempt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 🔐 Hash password & PIN before saving
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashSensitiveData(): Promise<void> {
    if (this.password && !this.password.startsWith('$2a$')) {
      this.password = await bcrypt.hash(this.password, 12); // cost factor 12 (OWASP recommended)
    }

    if (this.transactionPin && !this.transactionPin.startsWith('$2a$')) {
      this.transactionPin = await bcrypt.hash(this.transactionPin, 12);
    }
  }

  /**
   * ✅ Validate password
   */
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  /**
   * ✅ Validate transaction PIN
   */
  async validateTransactionPin(pin: string): Promise<boolean> {
    return bcrypt.compare(pin, this.transactionPin);
  }
}
