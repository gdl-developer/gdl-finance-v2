import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  UserInvestmentPool,
  InvestmentPoolType,
} from './investment-pull.entity';
import { Admin } from 'src/admin/admin/entities/admin.entity';

@Entity({ name: 'daily_accrual_logs' })
export class DailyAccrualLog {
  @PrimaryGeneratedColumn()
  id: number;

  // Link to the investment pool
  @ManyToOne(() => UserInvestmentPool, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'pool_id' })
  pool: UserInvestmentPool;

  @Column()
  pool_id: number;

  // Investment type (from pool)
  @Column({ type: 'enum', enum: InvestmentPoolType })
  investment_type: InvestmentPoolType;

  // Admin who performed the accrual
  @ManyToOne(() => Admin, { onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'admin_id', referencedColumnName: 'staffId' }) // <-- reference correct PK
  admin: Admin;

  @Column({ nullable: true })
  admin_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  admin_first_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  admin_last_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  admin_department: string;

  // Accrued amounts for the day
  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  accrued_gain: string;

  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  accrued_loss: string;

  // Balance after adding/subtracting accrued amounts
  @Column('decimal', { precision: 20, scale: 2, default: '0.00' })
  balance_with_gain_or_loss: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  accrual_date: Date;

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
