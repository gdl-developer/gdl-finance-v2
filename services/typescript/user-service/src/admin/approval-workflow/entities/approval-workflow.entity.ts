import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApprovalWorkflowStep } from 'src/admin/approval-workflow/entities/approval-workflow-step.entity';

@Entity()
@Index(['workflow_name'], { unique: true })
@Index(['isActive'])
@Index(['createdAt'])
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  workflow_name: string;

  @Column({ unique: true, length: 50, nullable: true })
  module: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ nullable: true })
  updatedBy: number;

  @OneToMany(
    () => ApprovalWorkflowStep,
    (step: ApprovalWorkflowStep) => step.workflow,
    {
      cascade: true,
    },
  )
  steps: ApprovalWorkflowStep[];

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

  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  deletedAt: Date;
}
