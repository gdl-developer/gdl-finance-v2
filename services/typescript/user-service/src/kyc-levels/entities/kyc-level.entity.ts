import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class KycLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  level_number: number;

  @Column()
  level_name: KYCLevels;

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

export enum KYCLevels {
  BRONZE = 'BRONZE', // for email and phone number
  SILVER = 'SILVER', // for bvn details and other details
  GOLD = 'GOLD', // for document verification
}
