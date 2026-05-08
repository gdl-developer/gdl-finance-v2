import { UserAccount } from 'src/user/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InvestmentPoolType {
  MMF = 'MMF',
  CANARY = 'CANARY',
  INCOME = 'INCOME',
}

export enum InvestmentPoolStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
}

@Entity('user_investment_pools')
export class UserInvestmentPool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: InvestmentPoolType,
  })
  type: InvestmentPoolType;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  total_invested: string;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  total_redeemed: string;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  current_balance: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ default: true })
  is_visible: boolean;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  accrued_gain: string;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  accrued_loss: string;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  balance_with_gain_or_loss: string;

  @Column('decimal', { precision: 10, scale: 4, default: '0.0000' })
  yield_rate: string;

  @Column('decimal', { precision: 20, scale: 4, default: '0.0000' })
  nav: string;

  @Column({ nullable: true })
  description: string;

  // 🔑 Relation to user with explicit column mapping
  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
