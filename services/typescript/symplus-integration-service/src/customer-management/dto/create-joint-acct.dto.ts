import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateJointAccountDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  additional_info: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_title_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_other_names: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_mobile_phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_marital_status_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_address_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_address_zip_code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_birth_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_bvn_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_address_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_employer_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_expiry_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_issue_auth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_issue_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_type_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_idn_doc_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_national_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_pep_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person1_place_of_birth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_title_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_other_names: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_mobile_phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_marital_status_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_address_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_address_zip_code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_birth_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_bvn_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_address_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_employer_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_expiry_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_issue_auth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_issue_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_type_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_idn_doc_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_national_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_pep_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  person2_place_of_birth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bank_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bank_account_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bank_account_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bank_branch_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bank_address_details: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  external_reference1: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  external_reference2: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  retain_customer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer_remarks: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  external_crm_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  officer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  referrer_cd: string;
}
