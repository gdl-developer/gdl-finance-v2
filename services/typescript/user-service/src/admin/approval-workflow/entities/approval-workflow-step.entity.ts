import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { ApprovalWorkflow } from 'src/admin/approval-workflow/entities/approval-workflow.entity';
import { Admin } from '../../admin/entities/admin.entity';

@Entity()
@Index(['workflow', 'level'], { unique: true })
@Index(['admin'])
@Check(`"level" > 0`)
export class ApprovalWorkflowStep {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ApprovalWorkflow,
    (workflow: ApprovalWorkflow) => workflow.steps,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Column({ name: 'admin_id', nullable: true })
  adminId: number;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column()
  level: number;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ nullable: true })
  updatedBy: number;

  @CreateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;

  @Column({ default: false })
  enforce_branch_restriction: boolean;
}
