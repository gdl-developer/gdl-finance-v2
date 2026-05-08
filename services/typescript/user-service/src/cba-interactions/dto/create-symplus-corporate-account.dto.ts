import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSymplusCorporateCustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  corporate_type_dm: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organization_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registration_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registration_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registration_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tax_identification_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  business_sector_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_zip_code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  alternate_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  alternate_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  website_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  twitter_address: string;

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
  bank_bvn_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_account_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_bank_name_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_employer_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_employer_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_lga_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_marital_status: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_mother_maiden_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_nin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_occupation: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_pep_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_place_of_birth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_state_of_origin_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_title_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_other_names: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_birth_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_telephone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_bvn_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory1_class: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_account_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_bank_name_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_employer_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_employer_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_lga_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_marital_status: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_mother_maiden_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_nin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_occupation: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_pep_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_place_of_birth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_state_of_origin_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_title_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_other_names: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_birth_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_telephone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_bvn_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory2_class: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_account_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_bank_name_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_employer_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_employer_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_lga_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_marital_status: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_mother_maiden_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_nin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_occupation: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_pep_yn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_place_of_birth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_state_of_origin_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_title_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_other_names: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_birth_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_telephone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_bvn_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signatory3_class: string;

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
}
