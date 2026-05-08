import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { InvestmentPoolType } from '../entities/investment-pull.entity';

export class CreateInvestmentPoolDto {
  @IsEnum(InvestmentPoolType)
  type: InvestmentPoolType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  total_invested?: number;

  @IsOptional()
  @IsNumber()
  yield_rate?: number;

  @IsOptional()
  @IsNumber()
  nav?: number;

  @IsOptional()
  is_visible?: boolean;
}
