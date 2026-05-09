import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('flexi_agents')
export class FlexiAgent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false })
  is_email_verified: boolean;

  @Exclude()
  @Column({ nullable: true })
  otp_code: string;

  @Exclude()
  @Column({ nullable: true })
  otp_expires_at: Date;

  @Column({ nullable: true })
  date_of_birth: string;

  @Exclude()
  @Column({ nullable: true, unique: true })
  bvn: string;

  @Column({ default: false })
  bvn_verified: boolean;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  marital_status: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ default: false })
  profile_completed: boolean;

  @Exclude()
  @Column({ nullable: true })
  refresh_token: string;

  @Column({ nullable: true })
  refresh_token_expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
