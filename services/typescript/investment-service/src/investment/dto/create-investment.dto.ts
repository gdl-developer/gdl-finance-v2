import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PoolType } from '../../entities/investment.entity';

export class CreateInvestmentDto {
  @IsEnum(PoolType)
  pool_type: PoolType;

  @IsNumber()
  @Min(1000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsOptional()
  reference?: string;
}
