import { IsBoolean, IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFixedDepositDto {
  @ApiProperty({ description: 'Is discount deposit' })
  @IsBoolean()
  @IsNotEmpty()
  readonly IsDiscountDeposit: boolean;

  @ApiProperty({ description: 'Interest rate' })
  @IsNumber()
  @IsNotEmpty()
  readonly InterestRate: number;

  @ApiProperty({ description: 'Amount' })
  @IsNumber()
  @IsNotEmpty()
  readonly Amount: number;

  @ApiProperty({ description: 'Narration' })
  @IsString()
  @IsNotEmpty()
  readonly Narration: string;

  @ApiProperty({ description: 'Tenure' })
  @IsNumber()
  @IsNotEmpty()
  readonly Tenure: number;

  @ApiProperty({ description: 'Customer ID' })
  @IsNumber()
  @IsNotEmpty()
  readonly CustomerID: number;

  @ApiProperty({ description: 'Product code' })
  @IsString()
  @IsNotEmpty()
  readonly ProductCode: string;

  @ApiProperty({ description: 'Liquidation account' })
  @IsString()
  @IsNotEmpty()
  readonly LiquidationAccount: string;

  @ApiProperty({ description: 'Apply interest monthly' })
  @IsBoolean()
  @IsNotEmpty()
  readonly ApplyInterestMonthly: boolean;

  @ApiProperty({ description: 'Apply interest on roll over' })
  @IsBoolean()
  @IsNotEmpty()
  readonly ApplyInterestOnRollOver: boolean;

  @ApiProperty({ description: 'Should roll over' })
  @IsBoolean()
  @IsNotEmpty()
  readonly ShouldRollOver: boolean;

  @ApiProperty({ description: 'Account opening tracking ref' })
  @IsString()
  @IsNotEmpty()
  readonly AccountOpenningTrackingRef: string;

  @ApiProperty({ description: 'Interest accrual commence date' })
  @IsString()
  @IsNotEmpty()
  readonly InterestAccrualCommenceDate: string;
}
