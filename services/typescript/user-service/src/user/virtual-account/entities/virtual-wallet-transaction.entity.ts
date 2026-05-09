import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  VirtualWallet,
  VirtualWalletTransactionType,
} from './virtual-wallet.entity';

@Entity()
export class VirtualWalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  virtual_wallet_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  transaction_reference: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  external_reference: string;

  @Column()
  transaction_type: VirtualWalletTransactionType;

  @Column('decimal', { precision: 20, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 20, scale: 2 })
  balance_before: number;

  @Column('decimal', { precision: 20, scale: 2 })
  balance_after: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sender_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sender_account: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sender_bank_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  receiver_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  receiver_account: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  receiver_bank_code: string;

  @Column({ default: 'SUCCESSFUL' })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 10, default: '00' })
  response_code: string;

  @Column({ type: 'text', nullable: true })
  response_message: string;

  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON string for additional data

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @ManyToOne(() => VirtualWallet)
  @JoinColumn({ name: 'virtual_wallet_id' })
  virtual_wallet: VirtualWallet;

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

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}
