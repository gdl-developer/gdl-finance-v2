import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FlexiRequest } from './flexi-request.entity';
import { FlexiRequestStatus } from './flexi-request.enums';
import { Admin } from '../../admin/admin/entities/admin.entity';

@Entity('flexi_approval_history')
export class FlexiApprovalHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FlexiRequest, (request) => request.approval_history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: FlexiRequest;

  @ManyToOne(() => Admin, { eager: true })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column()
  level: number;

  @Column({
    type: 'enum',
    enum: FlexiRequestStatus,
    default: FlexiRequestStatus.PENDING_APPROVAL, // Or whatever default is appropriate, or remove default
  })
  status: FlexiRequestStatus;

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  created_at: Date;
}
