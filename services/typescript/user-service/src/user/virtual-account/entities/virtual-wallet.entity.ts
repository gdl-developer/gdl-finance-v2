import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class VirtualWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  virtual_account_number: string;

  @Column({ type: 'varchar', length: 100 })
  virtual_account_name: string;

  @Column({ type: 'varchar', length: 10 })
  bank_code: string;

  @Column({ type: 'varchar', length: 50 })
  amount_control: string; // FIXED, VARIABLEAMOUNT, etc.

  /**
   * Current balance of the wallet.
   * This field is SECURE and safeguarded by database triggers.
   * It is automatically calculated as (total_credited - total_debited) on every update.
   */
  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  current_balance: number;

  /**
   * Total amount credited to this wallet.
   * Updated monotonically (increment only) during transaction processing.
   */
  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0.0 })
  total_credited: number;

  /**
   * Total amount debited from this wallet.
   * Updated monotonically (increment only) during transaction processing.
   */
  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0.0 })
  total_debited: number;

  @Column({ default: 'ACTIVE' })
  status: VirtualWalletStatus;

  @Column({ type: 'varchar', length: 10, default: '00' })
  response_code: string;

  @Column({ type: 'text', nullable: true })
  response_message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  callback_url: string;

  @Column({ type: 'text', nullable: true })
  FundAccountNo;

  @Column({ type: 'text', nullable: true })
  CashAccountNo;

  @Column({ type: 'text', nullable: true })
  extra_data: string;

  @Column({ type: 'timestamp', nullable: true })
  last_transaction_date: Date;

  @Column({ default: false })
  is_primary: boolean; // Mark if this is the user's primary virtual wallet

  @Column({ type: 'text', nullable: true })
  encrypted_symplus_customer_id: string; // Encrypted Symplus CustomerID for security

  @Column({ type: 'text', nullable: true })
  encrypted_infoware_customer_id: string; // Encrypted Symplus CustomerID for security

  @Column({ type: 'varchar', length: 10, nullable: true })
  symplus_status_code: string; // Symplus response status code

  @Column({ type: 'text', nullable: true })
  symplus_remarks: string; // Symplus response remarks

  @Column({ type: 'timestamp', nullable: true })
  symplus_created_at: Date; // When Symplus customer was created

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

export enum VirtualWalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum VirtualWalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REVERSAL = 'REVERSAL',
}
