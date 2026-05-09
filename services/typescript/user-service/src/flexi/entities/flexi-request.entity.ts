import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { UserAccount } from '../../user/user/entities/user.entity';
import { FlexiAgent } from './flexi-agent.entity';
import { GdlMarketer } from './gdl-marketer.entity';
import { FlexiDocument } from './flexi-document.entity';
import { ApprovalWorkflow } from '../../admin/approval-workflow/entities/approval-workflow.entity';
import { FlexiApprovalHistory } from './flexi-approval-history.entity';

import { FlexiRequestStatus, FlexiRequestType } from './flexi-request.enums';

@Entity('flexi_requests')
export class FlexiRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserAccount)
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  @ManyToOne(() => FlexiAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: FlexiAgent;

  @ManyToOne(() => GdlMarketer, { nullable: true })
  @JoinColumn({ name: 'marketer_id' })
  marketer: GdlMarketer;

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

  @OneToMany(() => FlexiDocument, (document) => document.request, {
    cascade: true,
  })
  documents: FlexiDocument[]; // List of uploaded documents

  @Column({ nullable: true })
  current_workflow_stage: string; // e.g., "Compliance Review", "Operations Approval"

  @Column({ nullable: true })
  approved_by: number; // Admin ID

  @Column({ nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  rejected_by: number;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ type: 'datetime', nullable: true })
  disbursed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  expiry_date: Date;

  // --- Workflow Integration ---

  @ManyToOne(() => ApprovalWorkflow, { nullable: true })
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Column({ default: 1 })
  current_approval_level: number;

  @OneToMany(() => FlexiApprovalHistory, (history) => history.request, {
    cascade: true,
    eager: false,
  })
  approval_history: FlexiApprovalHistory[];

  // --- Extension Fields ---

  @Column({ nullable: true })
  extension_tenure: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  extension_rate: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  extension_amount: number;

  @Column({ default: false })
  extension_payment_confirmed: boolean;

  @Column({ default: false })
  is_extension_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
