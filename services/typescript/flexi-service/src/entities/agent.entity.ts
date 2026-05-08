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

  @Column({ default: false })
  profile_completed: boolean;

  @Exclude()
  @Column({ nullable: true })
  refresh_token: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
