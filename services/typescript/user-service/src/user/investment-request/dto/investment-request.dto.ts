import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { MMFInvestmentRequestStatus } from '../entities/investment-request.entity';
import { Type } from 'class-transformer';
import { FundRedemptionMMFStatus } from '../entities/redemption-request.entity';
import { FundRedemptionCanaryStatus } from 'src/user/investment-request-canary/entities/redemption-canary-request.entity';
import { FundRedemptionIncomeStatus } from 'src/user/investment-request-income/entities/redemption-income-request.entity';

// -------------------
// Create DTO
// -------------------
export class CreateInvestmentRequestDto {
  @IsNumber()
  @Min(0.01)
  price: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsBoolean()
  reinvest: boolean;
}

// -------------------
// Response DTO
// -------------------
export class InvestmentRequestResponseDto {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  account: string;
  date: Date;
  price: number;
  quantity: number;
  reference: string;
  status: MMFInvestmentRequestStatus;
  admin_notes?: string;
  approved_by?: number;
  approved_at?: Date;
  rejected_by?: number;
  rejected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class FundRedemptionAdminResponseDto {
  id: number;
  user_id: number;

  first_name?: string;
  last_name?: string;

  // Masked account number (never expose full account)
  account: string;

  redemption_date: Date;
  amount: number;
  reference: string;
  status:
    | FundRedemptionMMFStatus
    | FundRedemptionCanaryStatus
    | FundRedemptionIncomeStatus;

  transaction_response?: string;

  completed_at?: Date;
  failed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// -------------------
// Admin Action DTOs
// -------------------
export class ApproveInvestmentRequestDto {
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class RejectInvestmentRequestDto {
  @IsString()
  admin_notes: string;
}

// -------------------
// Update DTO
// -------------------
export class UpdateInvestmentRequestDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

// -------------------
// Fund Redemption DTOs
// -------------------
export class CreateFundRedemptionDto {
  @IsString()
  fund: string; // The id of the request

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FundRedemptionItemDto {
  @IsString()
  @IsOptional()
  fund?: string;

  @IsString()
  account: string;

  @IsString()
  date: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsString()
  reference: string;
}

export class FundRedemptionDto {
  @IsArray()
  redemption: FundRedemptionItemDto[];
}

export class FundRedemptionResponseDto {
  success: boolean;
  message: string;
  data?: any;
  reference?: string;
  status?: string;
  created_at: Date;
}

// -------------------
// Query DTO
// -------------------
export class GetInvestmentRequestsDto {
  @IsOptional()
  @Type(() => Number) // converts string to number
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number) // converts string to number
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(MMFInvestmentRequestStatus)
  status?: MMFInvestmentRequestStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetRedemptionRequestsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(FundRedemptionMMFStatus)
  status?: FundRedemptionMMFStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
