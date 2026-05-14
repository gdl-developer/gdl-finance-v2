import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class AuditLogger {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ nullable: true })
  user_id: number;

  @Column()
  user_type: UserType;

  @Column()
  user_name: string;

  @Column()
  roles: string;

  @Column()
  action_performed: string;

  @Column()
  ip_address: string;

  @Column()
  tenant_code: string;

  @Column({
    type: "text",
  })
  attributes: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt: Date;
}

// move this to the admin resource later and let it be the single source for all references of this for the microservice of focus
export enum UserType {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  MICRO_SERVICE = "MICRO_SERVICE",
}
