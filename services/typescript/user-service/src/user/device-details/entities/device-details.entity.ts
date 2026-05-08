import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  browserName: string;

  @Column({ type: 'text' })
  userAgent: string;

  @Column({ type: 'varchar', length: 100 })
  os: string;

  @Column({ type: 'varchar', length: 100 })
  platform: string;

  @Column({ type: 'varchar', length: 255 })
  deviceHash: string; // 👈 no unique constraint here

  @Column({ type: 'uuid', unique: true })
  userId: string; // 👈 unique: true ensures 1 user ↔ 1 device

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
