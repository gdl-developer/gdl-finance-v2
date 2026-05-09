import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FlexiAgent } from './flexi-agent.entity';

@Entity('flexi_agent_login_history')
export class FlexiLoginHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FlexiAgent, (agent) => agent.id)
  @JoinColumn({ name: 'agent_id' })
  agent: FlexiAgent;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ default: 'Account was accessed' })
  status: string;

  @CreateDateColumn()
  login_time: Date;
}
