// director.entity.ts
import crypto from 'crypto';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company_profile } from './company.entity';
import { DirectorDocument } from './director-document.entity';
import { EncryptionTransformer } from 'typeorm-encrypted';
import { Exclude } from 'class-transformer';

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY must be set');
  }

  // Convert to Buffer to check length
  const buf = Buffer.from(key, 'utf-8');

  if (buf.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 bytes');
  }

  // Take first 32 bytes and return as hex string
  return buf.slice(0, 32).toString('hex');
}

@Entity('directors')
export class Director {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 150 })
  position: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    select: false,
    transformer: new EncryptionTransformer({
      key: getEncryptionKey(), // Must be Buffer of 32 bytes
      algorithm: 'aes-256-gcm',
      ivLength: 12,
      authTagLength: 16,
    }),
  })
  @Exclude()
  nin?: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    select: false,
    transformer: new EncryptionTransformer({
      key: getEncryptionKey(),
      algorithm: 'aes-256-gcm',
      ivLength: 12,
      authTagLength: 16,
    }),
  })
  @Exclude()
  bvn?: string;

  @Column({ nullable: true, length: 80 })
  nationality?: string;

  // Changed to date type for MySQL
  @Column({ type: 'date', nullable: true })
  dob?: string;

  @Column({ nullable: true, length: 40 })
  phone?: string;

  @Column({ nullable: true, length: 200 })
  email?: string;

  @Column({ nullable: true, length: 300 })
  residentialAddress?: string;

  @ManyToOne(() => Company_profile, (company) => company.directors, {
    onDelete: 'CASCADE',
  })
  company: Company_profile;

  @OneToMany(() => DirectorDocument, (doc) => doc.director, { cascade: true })
  documents: DirectorDocument[];
}
