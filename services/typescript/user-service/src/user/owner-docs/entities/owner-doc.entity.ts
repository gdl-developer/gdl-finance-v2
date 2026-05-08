import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class OwnerDoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  full_name: string;

  @Column({ nullable: true })
  identification_doc: IdentificationDocType;

  @Column({ type: 'varchar', length: 250, nullable: true })
  identification_number: string;

  @Column({ nullable: true })
  identification_doc_url: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  proof_of_address_doc: ProofOfAddressDocType;

  @Column({ nullable: true })
  proof_of_address_url: string;

  @Column({ default: 'NOT_VERIFIED' })
  owner_docs_verification_status: OwnerDocsVerificationStatus;

  @Column({ nullable: true })
  verified_by: number;

  @Column({ nullable: true })
  verification_date: Date;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at: Date;
}

export enum OwnerDocsVerificationStatus {
  VERIFIED = 'VERIFIED',
  NOT_VERIFIED = 'NOT_VERIFIED',
}

export enum IdentificationDocType {
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  INTERNATIONAL_PASSPORT = 'INTERNATIONAL_PASSPORT',
  NATIONAL_ID_CARD = 'NATIONAL_ID_CARD',
  // PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
}

export enum ProofOfAddressDocType {
  UTILITY_BILL = 'UTILITY_BILL',
  LEASE_DOCUMENT = 'LEASE_DOCUMENT',
  OTHER_HOUSE_DOCUMENTS = 'OTHER_HOUSE_DOCUMENTS',
  PROPERTY_TAX_DOCUMENT = 'PROPERTY_TAX_DOCUMENT',
  OTHER = 'OTHER', // to be specified.
}
