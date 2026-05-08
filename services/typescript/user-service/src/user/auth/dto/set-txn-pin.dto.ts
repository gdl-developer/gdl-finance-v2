// import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SetTxnPinDto {
  // @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  txn_pin: number;

  // @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_token: string;
}
