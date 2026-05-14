import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsNumber,
  IsPositive,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum AccountType {
  INDIVIDUAL = "IND",
  CORPORATE = "CORPORATE",
}

export enum Title {
  MR = "MR",
  MRS = "MRS",
  MISS = "MISS",
  DR = "DR",
  PROF = "PROF",
  CHIEF = "CHIEF",
  ENGR = "ENGR",
}

export enum Sex {
  MALE = 1,
  FEMALE = 0,
}

export class CreateCustomerDto {
  @ApiProperty({
    description: "Type of account to create",
    enum: AccountType,
    example: AccountType.INDIVIDUAL,
  })
  @IsEnum(AccountType)
  @IsNotEmpty()
  AccountType: AccountType;

  @ApiPropertyOptional({
    description: "Customer title",
    enum: Title,
    example: Title.MR,
  })
  @IsOptional()
  @IsEnum(Title)
  Title?: Title;

  @ApiProperty({ description: "Customer surname", example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: "Customer first name", example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({
    description: "Customer other names",
    example: "Michael",
  })
  @IsOptional()
  @IsString()
  Othernames?: string;

  @ApiPropertyOptional({
    description: "Company name (for corporate accounts)",
    example: "ABC Company Limited",
  })
  @IsOptional()
  @IsString()
  CompName?: string;

  @ApiProperty({ description: "Customer gender", enum: Sex, example: Sex.MALE })
  @IsEnum(Sex)
  @IsNotEmpty()
  Sex: Sex;

  @ApiProperty({
    description: "Date of birth in YYYY-MM-DD format",
    example: "1990-05-15",
  })
  @IsDateString()
  @IsNotEmpty()
  DateOfBirth: string;

  @ApiProperty({
    description: "Permanent address",
    example: "123 Main Street, Victoria Island",
  })
  @IsString()
  @IsNotEmpty()
  PermanentAddress: string;

  @ApiProperty({ description: "Nationality", example: "Nigerian" })
  @IsString()
  @IsNotEmpty()
  Nationality: string;

  @ApiProperty({ description: "Phone number", example: "+2348012345678" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: "Email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Bank account number", example: "1234567890" })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  BankAcctNumber: string;

  @ApiProperty({ description: "Bank code", example: "057" })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  BankCode: string;

  @ApiProperty({ description: "Next of kin full name", example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  NextOfKin: string;

  @ApiProperty({
    description: "Bank account name",
    example: "John Michael Doe",
  })
  @IsString()
  @IsNotEmpty()
  BankAcctName: string;

  @ApiProperty({ description: "City", example: "Lagos" })
  @IsString()
  @IsNotEmpty()
  City: string;

  @ApiProperty({ description: "State", example: "Lagos" })
  @IsString()
  @IsNotEmpty()
  State: string;

  @ApiProperty({ description: "Country", example: "Nigeria" })
  @IsString()
  @IsNotEmpty()
  Country: string;

  @ApiProperty({ description: "Branch code", example: "001" })
  @IsString()
  @IsNotEmpty()
  BranchCode: string;
}

export class CreateCustomerResponseDto {
  @ApiProperty({
    description: "Indicates if the request was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
    example: "Customer created successfully",
  })
  message: string;

  @ApiProperty({
    description: "Customer creation response data from Infoweb API",
  })
  data: any;

  @ApiProperty({
    description: "Session ID used for the request",
    example: "SESSION123456",
  })
  sessionId: string;

  @ApiProperty({
    description: "Timestamp of the response",
    example: "2024-01-15T10:30:00Z",
  })
  timestamp: Date;
}

// -------------------------
// Fund Account DTO
// -------------------------

export class FundAccountDto {
  @ApiProperty({ description: "Effective date in YYYY-MM-DD format" })
  @IsString()
  EffectiveDate: string;

  @ApiProperty({ description: "Caller Transaction ID" })
  @IsString()
  CallerTransactionID: string;

  @ApiProperty({ description: "CR Account Master" })
  @IsString()
  CRAccountMaster: string;

  @ApiProperty({ description: "CR Account Sub" })
  @IsString()
  CRAccountSub: string;

  @ApiProperty({ description: "DR Account Master" })
  @IsString()
  DRAccountMaster: string;

  @ApiProperty({ description: "DR Account Sub" })
  @IsString()
  DRAccountSub: string;

  @ApiProperty({ description: "Amount to fund" })
  @IsString()
  Amount: string;

  @ApiPropertyOptional({ description: "Narration" })
  @IsOptional()
  @IsString()
  Narration?: string;

  @ApiPropertyOptional({ description: "Branch code" })
  @IsOptional()
  @IsString()
  BranchCode?: string;

  @ApiPropertyOptional({ description: "Ledger type" })
  @IsOptional()
  @IsString()
  LedgerType?: string;

  @ApiPropertyOptional({ description: "Ref02" })
  @IsOptional()
  @IsString()
  Ref02?: string;
}

// -------------------------
// Customer Involvement DTO
// -------------------------
export class CustomerInvolvementDto {
  @ApiProperty({ description: "Customer ID", example: 123 })
  @IsNumber()
  @IsPositive()
  custId: number;

  @ApiPropertyOptional({ description: "Involvement type", example: "IWMMFUND" })
  @IsOptional()
  @IsString()
  InvType?: string = "IWMMFUND";

  @ApiPropertyOptional({ description: "Status", example: "True" })
  @IsOptional()
  @IsString()
  Status?: string = "True";

  @ApiPropertyOptional({ description: "Branch code", example: "004" })
  @IsOptional()
  @IsString()
  BranchCode?: string;

  @ApiPropertyOptional({ description: "Additional JSON payload" })
  @IsOptional()
  data?: Record<string, any>;
}

// -------------------------
// Subscription / Redeem DTO
// -------------------------
export class SubscriptionRedeemDto {
  @ApiProperty({ description: "Customer AID", example: 123 })
  @IsNumber()
  @IsPositive()
  CustAID: number;

  @ApiProperty({ description: "Fund code", example: "FUND001" })
  @IsString()
  @IsNotEmpty()
  FundCode: string;

  @ApiProperty({ description: "Effective date", example: "2025-11-10" })
  @IsDateString()
  EffectiveDate: string;

  @ApiProperty({ description: "Amount", example: 10000 })
  @IsNumber()
  @IsPositive()
  Amount: number;
}
