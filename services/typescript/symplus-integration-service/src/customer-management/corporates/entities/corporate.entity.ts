import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class CorporateCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  corporate_type_dm: string;

  @Column()
  organization_name: string;

  @Column({ type: "varchar", length: 10 })
  registration_number: string;

  @Column({ type: "varchar", length: 10 })
  registration_date: string;

  @Column({ type: "varchar", length: 20 })
  registration_country_cd: string;

  @Column({ type: "varchar", length: 10 })
  tax_identification_number: string;

  @Column({ type: "varchar", length: 20 })
  business_sector_cd: string;

  @Column({ type: "varchar", length: 20 })
  location_cd: string;

  @Column({ type: "varchar", length: 100 })
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
  primary_phone_no: string;

  @Column({ type: "text" })
  alternate_phone_no: string;

  @Column({ type: "text" })
  primary_email_address: string;

  @Column({ type: "text" })
  alternate_email_address: string;

  @Column({ type: "text" })
  website_address: string;

  @Column({ type: "text" })
  twitter_address: string;

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
  signatory1_yn: string;

  @Column({ type: "text" })
  signatory1_account_no: string;

  @Column({ type: "text" })
  signatory1_bank_name_cd: string;

  @Column({ type: "text" })
  signatory1_employer_address: string;

  @Column({ type: "text" })
  signatory1_employer_name: string;

  @Column({ type: "text" })
  signatory1_employer_phone_no: string;

  @Column({ type: "text" })
  signatory1_lga_cd: string;

  @Column({ type: "text" })
  signatory1_marital_status: string;

  @Column({ type: "text" })
  signatory1_mother_maiden_name: string;

  @Column({ type: "text" })
  signatory1_nin: string;

  @Column({ type: "text" })
  signatory1_occupation: string;

  @Column({ type: "text" })
  signatory1_pep_yn: string;

  @Column({ type: "text" })
  signatory1_place_of_birth: string;

  @Column({ type: "text" })
  signatory1_state_of_origin_cd: string;

  @Column({ type: "text" })
  signatory1_title_cd: string;

  @Column({ type: "text" })
  signatory1_last_name: string;

  @Column({ type: "text" })
  signatory1_first_name: string;

  @Column({ type: "text" })
  signatory1_other_names: string;

  @Column({ type: "text" })
  signatory1_gender_cd: string;

  @Column({ type: "text" })
  signatory1_birth_date: string;

  @Column({ type: "text" })
  signatory1_nationality_cd: string;

  @Column({ type: "text" })
  signatory1_job_title: string;

  @Column({ type: "text" })
  signatory1_telephone: string;

  @Column({ type: "text" })
  signatory1_email_address: string;

  @Column({ type: "text" })
  signatory1_address_street: string;

  @Column({ type: "text" })
  signatory1_address_city: string;

  @Column({ type: "text" })
  signatory1_address_country_cd: string;

  @Column({ type: "text" })
  signatory1_bvn_number: string;

  @Column({ type: "text" })
  signatory1_class: string;

  @Column({ type: "text" })
  signatory2_yn: string;

  @Column({ type: "text" })
  signatory2_account_no: string;

  @Column({ type: "text" })
  signatory2_bank_name_cd: string;

  @Column({ type: "text" })
  signatory2_employer_address: string;

  @Column({ type: "text" })
  signatory2_employer_name: string;

  @Column({ type: "text" })
  signatory2_employer_phone_no: string;

  @Column({ type: "text" })
  signatory2_lga_cd: string;

  @Column({ type: "text" })
  signatory2_marital_status: string;

  @Column({ type: "text" })
  signatory2_mother_maiden_name: string;

  @Column({ type: "text" })
  signatory2_nin: string;

  @Column({ type: "text" })
  signatory2_occupation: string;

  @Column({ type: "text" })
  signatory2_pep_yn: string;

  @Column({ type: "text" })
  signatory2_place_of_birth: string;

  @Column({ type: "text" })
  signatory2_state_of_origin_cd: string;

  @Column({ type: "text" })
  signatory2_title_cd: string;

  @Column({ type: "text" })
  signatory2_last_name: string;

  @Column({ type: "text" })
  signatory2_first_name: string;

  @Column({ type: "text" })
  signatory2_other_names: string;

  @Column({ type: "text" })
  signatory2_gender_cd: string;

  @Column({ type: "text" })
  signatory2_birth_date: string;

  @Column({ type: "text" })
  signatory2_nationality_cd: string;

  @Column({ type: "text" })
  signatory2_job_title: string;

  @Column({ type: "text" })
  signatory2_telephone: string;

  @Column({ type: "text" })
  signatory2_email_address: string;

  @Column({ type: "text" })
  signatory2_address_street: string;

  @Column({ type: "text" })
  signatory2_address_city: string;

  @Column({ type: "text" })
  signatory2_address_country_cd: string;

  @Column({ type: "text" })
  signatory2_bvn_number: string;

  @Column({ type: "text" })
  signatory2_class: string;

  @Column({ type: "text" })
  signatory3_yn: string;

  @Column({ type: "text" })
  signatory3_account_no: string;

  @Column({ type: "text" })
  signatory3_bank_name_cd: string;

  @Column({ type: "text" })
  signatory3_employer_address: string;

  @Column({ type: "text" })
  signatory3_employer_name: string;

  @Column({ type: "text" })
  signatory3_employer_phone_no: string;

  @Column({ type: "text" })
  signatory3_lga_cd: string;

  @Column({ type: "text" })
  signatory3_marital_status: string;

  @Column({ type: "text" })
  signatory3_mother_maiden_name: string;

  @Column({ type: "text" })
  signatory3_nin: string;

  @Column({ type: "text" })
  signatory3_occupation: string;

  @Column({ type: "text" })
  signatory3_pep_yn: string;

  @Column({ type: "text" })
  signatory3_place_of_birth: string;

  @Column({ type: "text" })
  signatory3_state_of_origin_cd: string;

  @Column({ type: "text" })
  signatory3_title_cd: string;

  @Column({ type: "text" })
  signatory3_last_name: string;

  @Column({ type: "text" })
  signatory3_first_name: string;

  @Column({ type: "text" })
  signatory3_other_names: string;

  @Column({ type: "text" })
  signatory3_gender_cd: string;

  @Column({ type: "text" })
  signatory3_birth_date: string;

  @Column({ type: "text" })
  signatory3_nationality_cd: string;

  @Column({ type: "text" })
  signatory3_job_title: string;

  @Column({ type: "text" })
  signatory3_telephone: string;

  @Column({ type: "text" })
  signatory3_email_address: string;

  @Column({ type: "text" })
  signatory3_address_street: string;

  @Column({ type: "text" })
  signatory3_address_city: string;

  @Column({ type: "text" })
  signatory3_address_country_cd: string;

  @Column({ type: "text" })
  signatory3_bvn_number: string;

  @Column({ type: "text" })
  signatory3_class: string;

  @Column({ type: "text" })
  external_reference1: string;

  @Column({ type: "text" })
  external_reference2: string;

  @Column({ type: "text" })
  retain_customer_id: string;

  @Column({ type: "text" })
  customer_remarks: string;

  @Column({ type: "text" })
  external_crm_id: string;

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
