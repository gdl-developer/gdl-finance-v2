import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { FlexiRequest } from './flexi-request.entity';

@Entity('flexi_documents')
export class FlexiDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_id: number;

  @ManyToOne(() => FlexiRequest, (request) => request.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: FlexiRequest;

  @Column()
  document_type: string; // e.g., "Travel ticket", "Lien", "Passport", etc.

  @Column({ type: 'text' })
  document_url: string; // S3 key/URL

  @Column({ nullable: true })
  file_name: string; // Original filename

  @Column({ nullable: true })
  file_size: string; // File size (e.g., "2.5MB")

  @CreateDateColumn()
  uploaded_at: Date;
}
