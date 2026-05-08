import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Director } from './director.entity';
import { CompanyDocument } from './document.entity';
import {
  ApprovalType,
  BusinessType,
  CompanyStatus,
} from '../interface/company-type.interface';

@Entity('company_profile')
@Index(['rcNumber'], { unique: true })
@Index(['status'])
export class Company_profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tradingName: string;

  @Column({ type: 'enum', enum: BusinessType })
  businessType: BusinessType;

  @Column({ type: 'varchar', length: 20, unique: true })
  rcNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tinNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vatNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cacStatus: string;

  @Column({ type: 'date', nullable: true })
  incorporationDate: Date;

  @Column({ type: 'text' })
  businessAddress: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 50 })
  state: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode: string;

  @Column({
    type: 'enum',
    enum: ApprovalType,
    default: ApprovalType.ALL,
  })
  approvalType: ApprovalType;

  @Column({ type: 'varchar', length: 50, default: 'Nigeria' })
  country: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  businessDescription: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.PENDING })
  status: CompanyStatus;

  @Column({ type: 'json', nullable: true })
  complianceStatus: Record<string, any>;

  @OneToMany(() => Director, (director) => director.company)
  directors: Director[];

  @OneToMany(() => CompanyDocument, (document) => document.company, {
    cascade: true,
  })
  documents: CompanyDocument[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (value: any) => value,
      from: (value: any) => {
        if (value && typeof value === 'object') {
          delete value.__proto__;
          delete value.constructor;
        }
        return value;
      },
    },
  })
  settings: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (value: any) => value,
      from: (value: any) => {
        if (value && typeof value === 'object') {
          delete value.__proto__;
          delete value.constructor;
        }
        return value;
      },
    },
  })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessModel: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ───────────── Virtual Properties ─────────────

  get isCompliant(): boolean {
    return this.status === CompanyStatus.ACTIVE && this.isVerified;
  }

  get requiresVerification(): boolean {
    return !this.isVerified && this.status === CompanyStatus.PENDING;
  }

  hasDocument(documentType: string): boolean {
    return (
      this.documents?.some((doc) => doc.documentType === documentType) || false
    );
  }

  getCompliancePercentage(): number {
    if (!this.complianceStatus) return 0;
    const total = Object.keys(this.complianceStatus).length;
    const completed = Object.values(this.complianceStatus).filter(
      (status) => status === 'completed',
    ).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  canOnboardEmployees(): boolean {
    return this.status === CompanyStatus.ACTIVE && this.isVerified;
  }
}
