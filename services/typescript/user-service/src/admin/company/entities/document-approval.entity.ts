import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { CompanyDocument } from './document.entity';
import { Admin } from 'src/admin/admin/entities/admin.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('document_approvals')
export class DocumentApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  comment: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  // The admin who approved/rejected (FK → Admin.staffId)
  @ManyToOne(() => Admin, { eager: true, nullable: false })
  @JoinColumn({ name: 'approvedById', referencedColumnName: 'staffId' })
  approvedBy: Admin;

  // The document being approved/rejected
  @ManyToOne(() => CompanyDocument, (document) => document.approvals, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'documentId' })
  @Exclude()
  document: CompanyDocument;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
