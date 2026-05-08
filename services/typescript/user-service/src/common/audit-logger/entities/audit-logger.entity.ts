import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  FLEXI_AGENT = 'FLEXI_AGENT',
  MICRO_SERVICE = 'MICRO_SERVICE',
}

@Entity()
export class AuditLogger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ default: UserType.ADMIN })
  user_type: UserType;

  @Column({ nullable: true })
  user_name: string;

  @Column({ nullable: true })
  roles: string;

  @Column({ nullable: true })
  action_performed: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({
    type: 'text',
  })
  attributes: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;
}
