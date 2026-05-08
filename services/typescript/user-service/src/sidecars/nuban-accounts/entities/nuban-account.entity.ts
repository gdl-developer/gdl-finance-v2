import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Entity,
} from 'typeorm';

@Entity()
export class NubanAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @Column({ unique: true })
  user_account_ref: string;

  @Column({ unique: true, type: 'varchar', length: 15 })
  nuban_account: string;

  @Column({ nullable: true }) // to be resolved from bankone in real time
  account_type: string;

  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  available_balance: number; // to be resolved from bankone in real time

  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  ledger_balance: number; // to be resolved from bankone in real time

  @Column('decimal', { precision: 20, scale: 2, default: 0.0 })
  withdrawable_balance: number; // to be resolved from bankone in real time

  @Column()
  nuban_source: NUBANSource;

  @Column({ default: 'NUBAN' })
  wallet_type: string;

  @Column({ default: 'Other Banks' })
  withdrawable_to: string;

  @Column({ default: 'NGN' })
  currency: string;

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

export enum NUBANSource {
  BANKONE = 'BANKONE',
}
