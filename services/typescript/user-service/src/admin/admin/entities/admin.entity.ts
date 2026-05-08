import { Exclude } from 'class-transformer';
import { BusinessUnit } from 'src/admin/business-units/entities/business-unit.entity';
import { OfficeBranch } from 'src/admin/office-branches/entities/office-branch.entity';
import { AdminPermission } from 'src/admin/permission/entities/permission.entity';
import { AdminRole } from 'src/admin/role/entities/role.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  staffId: number;

  @Column()
  staffFirstName: string;

  @Column()
  staffLastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ default: false })
  activationStatus: boolean;

  @Column()
  staffEmail: string;

  @Column({ nullable: true })
  referral_code: string; // just added

  @Column({ nullable: true }) // migration run for this throwing error
  last_login: Date;

  @Column({ default: 'ADMIN' })
  user_type: UserType;

  @ManyToOne(() => BusinessUnit)
  @JoinColumn({ name: 'business_unit_id' })
  business_unit: BusinessUnit;

  @ManyToOne(() => OfficeBranch)
  @JoinColumn({ name: 'branch_id' })
  office_branch: OfficeBranch;

  @Column({ default: 'ACTIVE' })
  account_status: UserAccountStatus;

  @CreateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  createdAt: string;

  @UpdateDateColumn({
    default: () => 'CURRENT_TIMESTAMP(6)',
    type: 'timestamp',
  })
  updatedAt: string;

  @ManyToOne(() => AdminRole)
  @JoinColumn({ name: 'roles_id' })
  roles: AdminRole;

  permissions: AdminPermission[];

  @Exclude()
  @Column({ nullable: true })
  refresh_token: string;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}

export enum UserType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserAccountStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  BANNED = 'BANNED',
  BLOCKED = 'BLOCKED',
}
