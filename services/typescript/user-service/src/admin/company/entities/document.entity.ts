import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company_profile } from './company.entity';
import { DocumentApproval } from './document-approval.entity';
import { Exclude } from 'class-transformer';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('documents')
export class CompanyDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  documentType: string;

  @Column({ type: 'varchar', length: 300 })
  url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string;

  // Overall status of the document
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @ManyToOne(() => Company_profile, (company) => company.documents, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @Exclude()
  company: Company_profile;

  @OneToMany(() => DocumentApproval, (approval) => approval.document, {
    cascade: true,
  })
  approvals: DocumentApproval[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
