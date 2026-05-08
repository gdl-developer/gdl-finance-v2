import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ default: 'MAIN' })
  wallet_type: string;

  @Column({ type: 'varchar', length: 50, unique: true }) // maybe use this as the user_txn_ref
  wallet_ref: string;

  @Column({ type: 'varchar', length: 20 }) // why must phone number be uniique - unique: true
  phonenumber: string;

  @Column({ type: 'varchar', length: 30 })
  firstname: string;

  @Column({ type: 'varchar', length: 30 })
  lastname: string;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: 'Other Banks' })
  withdrawable_to: string;

  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  available_balance: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  ledger_balance: number;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  bvn: string;

  @Column({ default: 'ACTIVE' }) // to be blocked if any fraudulent activity is noticed
  wallet_status: AccountStatus;

  @Column({ default: false })
  auto_fund_wallet_from_card: boolean; // to be changed to true if user opts in so will also be checked to see if its true to charge user's card automatically

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  public updatedAt: Date;
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  BANNED = 'BANNED',
  BLOCKED = 'BLOCKED',
}

export enum WalletTypes {
  ACCOUNT = 'ACCOUNT',
  SAVINGS_WALLET = 'SAVINGS_WALLET',
  INVESTMENT_WALLET = 'INVESTMENT_WALLET',
  HPA = 'HPA',
}
