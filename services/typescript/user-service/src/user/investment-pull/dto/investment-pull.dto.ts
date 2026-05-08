import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// -------------------
// ENUM: Investment Pool Types
// -------------------
export enum InvestmentPoolType {
  MMF = 'MMF',
  CANARY = 'CANARY',
  INCOME = 'INCOME',
}

// -------------------
// ENUM: Investment Pool Status
// -------------------
export enum InvestmentPoolStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
}

// -------------------
// CREATE DTO
// -------------------
export class CreateInvestmentPoolDto {
  @IsEnum(InvestmentPoolType)
  pool_type: InvestmentPoolType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  user_id?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_invested: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_redeemed: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  current_balance: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  yield_rate?: number = 0;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nav?: number = 0;

  @IsOptional()
  @IsEnum(InvestmentPoolStatus)
  status?: InvestmentPoolStatus = InvestmentPoolStatus.ACTIVE;

  @IsOptional()
  @IsBoolean()
  is_visible?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_updated_by?: string;
}

// -------------------
// CREATE DTO
// -------------------
export class CreateInvestmentPool2Dto {
  @IsEnum(InvestmentPoolType)
  pool_type: InvestmentPoolType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  user_id?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_invested: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_redeemed: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  current_balance: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  yield_rate?: number = 0;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nav?: number = 0;

  @IsOptional()
  @IsEnum(InvestmentPoolStatus)
  status?: InvestmentPoolStatus = InvestmentPoolStatus.ACTIVE;

  @IsOptional()
  @IsBoolean()
  is_visible?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_updated_by?: string;
}

// -------------------
// UPDATE DTO
// -------------------
export class UpdateInvestmentPoolDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_invested?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total_redeemed?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  current_balance?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  nav?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  yield_rate?: number;

  @IsOptional()
  @IsEnum(InvestmentPoolStatus)
  status?: InvestmentPoolStatus;

  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;
}

// -------------------
// RESPONSE DTO
// -------------------
export class InvestmentPoolResponseDto {
  id: number;
  type: InvestmentPoolType;
  name: string;
  description?: string;
  unit_price: number;
  nav?: number;
  status: InvestmentPoolStatus;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InfowarePortfolioResponse {
  DataTableZ?: any;
  DataTable?: {
    ColumnDef: Record<string, string>;
    Rows: Record<string, any>[];
  };
  StatusID: number;
  StatusMessage: string;
  OutValue: string;
}

export interface PortfolioPositionResponse {
  DataTable?: {
    ColumnDef: Record<string, string>;
    Rows: Array<Record<string, string>>;
  } | null;
  StatusID: number;
  StatusMessage: string;
  OutValue?: string;
}
