import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OfficeBranch } from 'src/admin/office-branches/entities/office-branch.entity';

@Entity('gdl_marketers')
export class GdlMarketer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  office_branch_name: string;

  @Column({ name: 'office_branch_id', nullable: true })
  office_branch_id: number;

  @ManyToOne(() => OfficeBranch, { nullable: true })
  @JoinColumn({ name: 'office_branch_id' })
  office_branch: OfficeBranch;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
