import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InvestmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PoolType {
  MMF = 'MMF',
  CANARY = 'CANARY',
  INCOME = 'INCOME',
}

@Entity('mmf_investment_request')
export class InvestmentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'enum',
    enum: PoolType,
    default: PoolType.MMF,
  })
  pool_type: PoolType;

  @Column('decimal', { precision: 20, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  quantity: number;

  @Column({ name: 'account', nullable: true })
  account_number: string;

  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: InvestmentStatus,
    default: InvestmentStatus.PENDING,
  })
  status: InvestmentStatus;

  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
