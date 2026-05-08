import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetFixedDepositAccountByLiquidationAccountDto {
  @ApiProperty({ description: 'Liquidation account number' })
  @IsString()
  @IsNotEmpty()
  readonly accountNumber: string;
}
