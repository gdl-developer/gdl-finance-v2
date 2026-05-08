import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBankOneCustomerDto {
  @IsString()
  @IsNotEmpty()
  FirstName: string;

  @IsString()
  @IsNotEmpty()
  LastName: string;

  @IsString()
  @IsNotEmpty()
  OtherNames: string;

  @IsString()
  @IsNotEmpty()
  City: string;

  @IsString()
  @IsNotEmpty()
  Address: string;

  @IsNotEmpty()
  @IsNumber()
  Gender: number; // 0 - Male, 1 - Female

  @IsString()
  @IsNotEmpty()
  DateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  PhoneNo: string;

  @IsString()
  @IsNotEmpty()
  PlaceOfBirth: string;

  @IsString()
  @IsNotEmpty()
  NationalIdentityNo: string;

  @IsString()
  @IsNotEmpty()
  NextOfKinName: string;

  @IsString()
  @IsNotEmpty()
  NextOfKinPhoneNumber: string;

  @IsString()
  @IsNotEmpty()
  ReferralName: string;

  @IsString()
  @IsNotEmpty()
  ReferralPhoneNo: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  CustomerType: string; // where do we get this?

  @IsNotEmpty()
  @IsNumber()
  BranchID: number;

  @IsString()
  @IsNotEmpty()
  BankVerificationNumber: string;

  @IsString()
  @IsNotEmpty()
  Email: string;

  @IsString()
  @IsNotEmpty()
  HasCompleteDocumentation: boolean;

  @IsString()
  @IsNotEmpty()
  AccountOfficerCode: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  customerPassportInBytes: string; // optional

  @IsNotEmpty()
  @IsBoolean()
  HasCurrentRunningLoanAndNottDefaulting: boolean;

  @IsNotEmpty()
  @IsBoolean()
  HasDefaultedInAnyLoan: boolean;

  @IsNotEmpty()
  @IsBoolean()
  HasNoOutStandingLoanAndNotDefaulting: boolean;

  @IsNotEmpty()
  @IsString()
  CustomerPassportInBytes: string;
}
