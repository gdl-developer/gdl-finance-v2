import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBankOneCustomerNAccountDto {
  @IsNotEmpty()
  @IsString()
  TransactionTrackingRef: string;

  @IsNotEmpty()
  @IsString()
  AccountOpeningTrackingRef: string;

  @IsNotEmpty()
  @IsString()
  ProductCode: string;

  @IsNotEmpty()
  @IsString()
  LastName: string;

  @IsNotEmpty()
  @IsString()
  OtherNames: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  BVN?: string;

  @IsNotEmpty()
  @IsString()
  PhoneNo: string;

  @IsNotEmpty()
  @IsString()
  Gender: string;

  @IsNotEmpty()
  @IsString()
  PlaceOfBirth: string;

  @IsNotEmpty()
  @IsString()
  DateOfBirth: Date | string;

  @IsNotEmpty()
  @IsString()
  Address: string;

  @IsNotEmpty()
  @IsString()
  NationalIdentityNo: string;

  @IsNotEmpty()
  @IsString()
  NextOfKinPhoneNo: string;

  @IsNotEmpty()
  @IsString()
  NextOfKinName: string;

  @IsNotEmpty()
  @IsString()
  ReferralPhoneNo: string;

  @IsNotEmpty()
  @IsString()
  ReferralName: string;

  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  HasSufficientInfoOnAccountInfo: boolean;

  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  AccountInformationSource: number;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  OtherAccountInformationSource: string;

  @IsNotEmpty()
  @IsString()
  AccountOfficerCode: string;

  @IsNotEmpty()
  @IsString()
  Email: string;

  @IsNotEmpty()
  @IsString()
  NotificationPreference: string;

  @IsNotEmpty()
  @IsString()
  TransactionPermission: string;

  @IsNotEmpty()
  @IsNumber()
  AccountTier: number;

  @IsNotEmpty()
  @IsString()
  CustomerImage: string; // type 'Base64',

  @IsNotEmpty()
  @IsString()
  CustomerSignature: string; // 'Base64',

  @IsNotEmpty()
  @IsString()
  IdentificationImage: string; // 'Base64'
}
