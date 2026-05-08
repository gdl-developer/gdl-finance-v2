import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { CanaryInvestmentRequestStatus } from '../entities/investment-request-canary.entity';
import { Type } from 'class-transformer';

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
  status: any;
  admin_notes?: string;
  approved_by?: number;
  approved_at?: Date;
  rejected_by?: number;
  rejected_at?: Date;
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
  fund: string;

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
  @IsEnum(CanaryInvestmentRequestStatus)
  status?: CanaryInvestmentRequestStatus;

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
