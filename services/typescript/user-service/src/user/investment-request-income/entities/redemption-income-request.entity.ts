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
import { IncomeInvestmentRequest } from './investment-request-income.entity';

export enum FundRedemptionIncomeStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class FundRedemptionIncomeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  // Removed @Column user_id, TypeORM will handle it via @ManyToOne
  @Column()
  user_identity: number;

  /** Proper relation mapping */
  @ManyToOne(() => UserAccount, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_identity' })
  user: UserAccount;

  @Column({ nullable: true })
  investment_request_id: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 100 })
  account: string;

  @Column({ type: 'date' })
  redemption_date: Date;

  @Column('decimal', { precision: 20, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @Column({ nullable: true })
  approved_by: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  rejected_by: number;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date;

  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @Column({ type: 'text', nullable: true })
  fund_account_no: string;

  @Column({ type: 'text', nullable: true })
  cash_account_no: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: FundRedemptionIncomeStatus.PROCESSING,
  })
  status: FundRedemptionIncomeStatus;

  @Column({ type: 'text', nullable: true })
  transaction_response: string;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  failed_at: Date;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
