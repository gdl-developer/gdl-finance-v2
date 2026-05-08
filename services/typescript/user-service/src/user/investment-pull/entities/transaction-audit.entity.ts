import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TransactionAuditType {
  REDEMPTION = 'REDEMPTION',
  DEDUCTION = 'DEDUCTION',
  INVESTMENT = 'INVESTMENT',
}

export enum TransactionAuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Entity({ name: 'transaction_audits' })
export class TransactionAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 64 })
  reference: string;

  @Column({ type: 'enum', enum: TransactionAuditType })
  type: TransactionAuditType;

  @Column('decimal', { precision: 20, scale: 2 })
  amount: string;

  @Column('decimal', { precision: 20, scale: 2 })
  balance_before: string;

  @Column('decimal', { precision: 20, scale: 2 })
  balance_after: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  related_entity?: string;

  @Column({
    type: 'enum',
    enum: TransactionAuditStatus,
    default: TransactionAuditStatus.PENDING,
  })
  status: TransactionAuditStatus;

  @Column({ type: 'text', nullable: true })
  meta?: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;
}
