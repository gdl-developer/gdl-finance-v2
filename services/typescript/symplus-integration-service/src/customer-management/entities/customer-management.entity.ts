import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class CustomerManagement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  title_cd: string;

  @Column({ type: "varchar", length: 20 })
  last_name: string;

  @Column({ type: "varchar", length: 20 })
  first_name: string;

  @Column({ type: "varchar", length: 20 })
  other_names: string;

  @Column({ type: "text" })
  gender_cd: string;

  @Column({ type: "text" })
  marital_status_cd: string;

  @Column({ type: "text" })
  birth_date: string;

  @Column({ type: "varchar", length: 20 })
  mother_maiden_name: string;

  @Column({ type: "text" })
  wedding_anniversary_date: string;

  @Column({ type: "text" })
  nationality_cd: string;

  @Column({ type: "text" })
  mobile_phone_no: string;

  @Column({ type: "text" })
  alternate_phone_no: string;

  @Column({ type: "varchar", length: 20 })
  primary_email_address: string;

  @Column({ type: "text" })
  alternate_email_address: string;

  @Column({ type: "text" })
  address_street: string;

  @Column({ type: "text" })
  address_city: string;

  @Column({ type: "text" })
  address_state_cd: string;

  @Column({ type: "text" })
  address_country_cd: string;

  @Column({ type: "text" })
  address_zip_code: string;

  @Column({ type: "text" })
  occupation: string;

  @Column({ type: "text" })
  employer_name: string;

  @Column({ type: "text" })
  employment_job_title: string;

  @Column({ type: "text" })
  employer_reference: string;

  @Column({ type: "text" })
  employer_address_street: string;

  @Column({ type: "text" })
  employer_address_city: string;

  @Column({ type: "text" })
  employer_address_country_cd: string;

  @Column({ type: "text" })
  estimated_annual_income: string;

  @Column({ type: "text" })
  bank_cd: string;

  @Column({ type: "text" })
  bank_account_name: string;

  @Column({ type: "text" })
  bank_account_no: string;

  @Column({ type: "text" })
  bank_branch_name: string;

  @Column({ type: "text" })
  bank_address_details: string;

  @Column({ type: "text" })
  bank_bvn_no: string;

  @Column({ type: "text" })
  next_of_kin_title_cd: string;

  @Column({ type: "text" })
  next_of_kin_last_name: string;

  @Column({ type: "text" })
  next_of_kin_first_name: string;

  @Column({ type: "text" })
  next_of_kin_other_names: string;

  @Column({ type: "text" })
  next_of_kin_gender_cd: string;

  @Column({ type: "text" })
  next_of_kin_relationship_cd: string;

  @Column({ type: "text" })
  next_of_kin_telephone: string;

  @Column({ type: "text" })
  next_of_kin_email_address: string;

  @Column({ type: "text" })
  next_of_kin_address_street: string;

  @Column({ type: "text" })
  next_of_kin_address_city: string;

  @Column({ type: "text" })
  next_of_kin_address_country_cd: string;

  @Column({ type: "text" })
  next_of_kin_address_zip_code: string;

  @Column({ type: "text" })
  identity_doc_type_cd: string;

  @Column({ type: "text" })
  identity_doc_name: string;

  @Column({ type: "text" })
  identity_doc_no: string;

  @Column({ type: "text" })
  identity_doc_issue_date: string;

  @Column({ type: "text" })
  identity_doc_expiry_date: string;

  @Column({ type: "text" })
  identity_doc_issue_authority: string;

  @Column({ type: "text" })
  location_cd: string;

  @Column({ type: "text" })
  external_reference1: string;

  @Column({ type: "text" })
  external_reference2: string;

  @Column({ type: "text" })
  retain_customer_id: string;

  @Column({ type: "text" })
  external_crm_id: string;

  @Column({ type: "text" })
  officer_id: string;

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
