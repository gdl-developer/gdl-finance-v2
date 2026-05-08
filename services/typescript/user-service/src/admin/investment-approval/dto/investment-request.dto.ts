import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MMFInvestmentRequestStatus } from 'src/user/investment-request/entities/investment-request.entity';

// -------------------
// Create DTO
// -------------------
export class CreateInvestmentRequestAdminDto {
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
export class InvestmentRequestResponseAdminDto {
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

// -------------------
// Admin Action DTOs
// -------------------
export class ApproveInvestmentRequestAdminDto {
  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class ApproveWithdrawalRequestAdminDto {
  @IsOptional()
  @IsString()
  type?: string;
}

export class RejectWithdrawalRequestAdminDto {
  @IsString()
  type: string;

  @IsString()
  admin_notes: string;
}

export class RejectInvestmentRequestAdminDto {
  @IsString()
  admin_notes: string;

  @IsOptional()
  @IsString()
  type?: string;
}

// -------------------
// Update DTO
// -------------------
export class UpdateInvestmentRequestAdminDto {
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
export class CreateFundRedemptioAdminnDto {
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

export class FundRedemptionResponseAdminDto {
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
export class GetInvestmentRequestsAdminDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  })
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? 20 : parsed;
  })
  @IsNumber()
  @Min(1)
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
  type?: string;
}

// Export AddDailyAccrualDto from the separate file
export { AddDailyAccrualDto } from './add-daily-accrual.dto';
