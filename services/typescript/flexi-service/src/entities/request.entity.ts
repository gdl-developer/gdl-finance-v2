import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FlexiRequestStatus, FlexiRequestType } from './request.enums';

@Entity('flexi_requests')
export class FlexiRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: string; // Foreign ID from Identity/Account Service

  @Column({ name: 'agent_id', nullable: true })
  agentId: number;

  @Column({ name: 'marketer_id', nullable: true })
  marketerId: number;

  @Column({
    type: 'enum',
    enum: FlexiRequestType,
    default: FlexiRequestType.GENERAL_REQUEST,
  })
  request_type: FlexiRequestType;

  @Column({
    type: 'enum',
    enum: FlexiRequestStatus,
    default: FlexiRequestStatus.PENDING_DOCS,
  })
  status: FlexiRequestStatus;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ nullable: true })
  bank_one_account_number: string;

  @Column({ nullable: true })
  recipient_bank_name: string;

  @Column({ nullable: true })
  recipient_account_number: string;

  @Column({ nullable: true })
  recipient_account_name: string;

  @Column({ nullable: true })
  tenure: string;

  @Column({ nullable: true })
  rate: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
