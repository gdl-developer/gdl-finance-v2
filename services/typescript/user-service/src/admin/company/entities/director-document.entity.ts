import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Director } from './director.entity';
import { Exclude } from 'class-transformer';

export enum DirectorDocType {
  ID_CARD = 'ID_CARD',
  PASSPORT = 'PASSPORT',
  NIN_SLIP = 'NIN_SLIP',
  BVN_SLIP = 'BVN_SLIP',
  OTHER = 'OTHER',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('director_documents')
export class DirectorDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DirectorDocType })
  @Index()
  documentType: DirectorDocType;

  @Column({ type: 'varchar', length: 300 })
  url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string;

  // ✅ Approval workflow for director documents
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @ManyToOne(() => Director, (director) => director.documents, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @Exclude()
  director: Director;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
