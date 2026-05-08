import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class OfficeBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branch_name: string;

  @Column()
  branch_code: string;

  @Column()
  created_by: number;

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
}
