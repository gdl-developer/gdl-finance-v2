import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyUser } from './company-user.entity';

export enum AuthActionType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TRANSACTION_PIN_RESET = 'TRANSACTION_PIN_RESET',
  TWO_FACTOR_AUTH = 'TWO_FACTOR_AUTH',
}

@Entity('company_user_auth_actions')
export class CompanyUserAuthAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyUser)
  @JoinColumn({ name: 'companyUserId' })
  companyUser: CompanyUser;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'enum', enum: AuthActionType })
  actionType: AuthActionType;

  @Column({ type: 'varchar', length: 50 })
  requestToken: string;

  @Column({ type: 'varchar', length: 10 })
  requestOtp: string;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
