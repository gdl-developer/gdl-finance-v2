import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserAccount } from '../../user/entities/user.entity';

export enum IncomeInvestmentRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class IncomeInvestmentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  // Key user information
  @Column({ type: 'varchar', length: 30, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  last_name: string;

  // Core investment request information
  @Column({ type: 'varchar', length: 100 })
  account: string; // Account number

  @Column({ type: 'date' })
  date: Date; // Investment date

  @Column('decimal', { precision: 20, scale: 2 })
  price: number; // Unit price

  @Column('decimal', { precision: 20, scale: 2 })
  quantity: number; // Quantity purchased

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string; // External or internal reference

  // Request status
  @Column({
    type: 'varchar',
    length: 20,
    default: IncomeInvestmentRequestStatus.PENDING,
  })
  status: IncomeInvestmentRequestStatus;

  // Admin notes and actions
  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @Column({ nullable: true })
  approved_by: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  rejected_by: number;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date;

  @Column({ type: 'text', nullable: true })
  FundAccountNo;

  @Column({ type: 'text', nullable: true })
  CashAccountNo;

  // Relationship to user
  @ManyToOne(() => UserAccount)
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  // Audit fields
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at: Date;
}
