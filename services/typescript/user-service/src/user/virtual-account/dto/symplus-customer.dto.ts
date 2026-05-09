import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreateSymplusCustomerDto {
  @IsString()
  last_name: string;

  @IsString()
  first_name: string;

  @IsString()
  gender_cd: string; // M or F

  @IsDateString()
  birth_date: string; // YYYY-MM-DD format

  @IsString()
  nationality_cd: string; // e.g., "NGA"

  @IsString()
  mobile_phone_no: string; // e.g., "+2348012345678"

  @IsEmail()
  primary_email_address: string;

  @IsString()
  address_street: string;

  @IsString()
  address_city: string;

  @IsString()
  address_country_cd: string; // e.g., "NGA"
}

export class SymplusCustomerResponseDto {
  data: {
    code: string; // "P" for pending
    remarks: string; // "Request has been received and is awaiting approval"
    reference: {
      CustomerID: string; // "CS-I-CRT-10009704"
    };
  };
}

export class SymplusCustomerErrorResponseDto {
  error?: string;
  message?: string;
  statusCode?: number;
}

export class DecryptedSymplusCustomerDto {
  customer_id: string;
  status_code: string;
  remarks: string;
  created_at: Date;
}
