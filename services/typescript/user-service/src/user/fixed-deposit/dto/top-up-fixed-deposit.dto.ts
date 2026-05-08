import { IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpFixedDepositDto {
  @ApiProperty({ description: 'Source account number' })
  @IsString()
  @IsNotEmpty()
  readonly SourceAccountNumber: string;

  @ApiProperty({ description: 'Fixed deposit account number' })
  @IsString()
  @IsNotEmpty()
  readonly FixedDepositAccountNumber: string;

  @ApiProperty({ description: 'Narration' })
  @IsString()
  @IsNotEmpty()
  readonly Narration: string;

  @ApiProperty({ description: 'Amount' })
  @IsNumber()
  @IsNotEmpty()
  readonly Amount: number;

  @ApiProperty({ description: 'Instrument number' })
  @IsString()
  readonly InstrumentNo: string;
}
