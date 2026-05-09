import { UserAccount } from 'src/user/user/entities/user.entity';
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Column,
} from 'typeorm';

@Entity()
export class CbaInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => UserAccount)
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  @Column({ nullable: true })
  symplus_customer_id: string;

  @Column({ nullable: true })
  bankone_customer_id: string;

  @Column({ nullable: true })
  bankone_account_number: string;

  @Column({ default: 'BANKONE | SYMPLUS' })
  cba_account_type: CBAAccountTypes; //  this shouldn't apply

  @CreateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  createdAt: string;

  @UpdateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  updatedAt: string;
}

export enum CBAAccountTypes {
  BANKONE = 'BANKONE',
  SYMPLUS = 'SYMPLUS',
}
