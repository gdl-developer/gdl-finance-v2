import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSymplusIndividualCustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  other_names?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gender_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  marital_status_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  birth_date: Date | string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  mother_maiden_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  wedding_anniversary_date?: Date | string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nationality_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mobile_phone_no: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  alternate_phone_no?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_email_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  alternate_email_address?: string;

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
  @IsOptional()
  address_state_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address_zip_code?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  occupation?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employer_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employment_job_title?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employer_reference?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employer_address_street?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employer_address_city?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employer_address_country_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  estimated_annual_income?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_account_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_account_no?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_branch_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_address_details?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bank_bvn_no?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_title_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_last_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_first_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_other_names?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_gender_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_relationship_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_telephone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_email_address?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_address_street?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_address_city?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_address_country_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  next_of_kin_address_zip_code?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_type_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_no?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_issue_date?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_expiry_date?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  identity_doc_issue_authority?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  location_cd?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  external_reference1?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  external_reference2?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  retain_customer_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  external_crm_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  officer_id?: string;
}
