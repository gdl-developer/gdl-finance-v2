import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserAccount } from './user.entity';

@Entity('consent_audit_logs')
export class ConsentAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => UserAccount)
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  @Column()
  terms_accepted: boolean;

  @Column()
  privacy_policy_accepted: boolean;

  @Column()
  marketing_consent: boolean;

  @Column({ type: 'varchar', length: 50 })
  policy_version: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
