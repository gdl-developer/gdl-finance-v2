import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvestmentPoolType } from 'src/user/investment-pull/entities/investment-pull.entity';

export class AddDailyAccrualDto {
  @ApiProperty({ description: 'Admin ID performing the accrual' })
  @IsNumber()
  @Min(1)
  adminId: number;

  @ApiProperty({
    description: 'Investment pool type',
    enum: InvestmentPoolType,
  })
  @IsEnum(InvestmentPoolType)
  type: InvestmentPoolType;

  @ApiProperty({ description: 'Gain amount (format: 0.00)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d{2}$/, {
    message:
      'Gain must be a decimal number with exactly 2 decimal places (e.g., 100.00)',
  })
  gain?: string;

  @ApiProperty({ description: 'Loss amount (format: 0.00)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d{2}$/, {
    message:
      'Loss must be a decimal number with exactly 2 decimal places (e.g., 50.00)',
  })
  loss?: string;
}
