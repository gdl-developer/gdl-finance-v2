import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateBankOneCustomerDto {
  @IsString()
  @IsNotEmpty()
  CustomerID: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  LastName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  FirstName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  OtherNames: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  City: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  Address: string;

  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  Gender: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  DateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  PhoneNo: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  PlaceOfBirth: string;

  @IsString()
  @IsNotEmpty()
  NationalIdentityNo: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  NextOfKinName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  NextOfKinPhoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ReferralName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ReferralPhoneNo: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  CustomerType: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  BranchID: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  BankVerificationNumber: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  Email: string;

  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  HasCurrentRunningLoanAndNottDefaulting: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  HasDefaultedInAnyLoan: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  HasNoOutStandingLoanAndNotDefaulting: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @IsOptional()
  HasCompleteDocumentatiOn: boolean;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  CustomerPassportInBytes: string;

  // @IsNotEmpty()
  // @IsString()
  // AccountOfficerCode: string;
}
