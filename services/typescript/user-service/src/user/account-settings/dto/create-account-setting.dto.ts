import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateAccountSettingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty()
  @IsNotEmpty()
  settlement_account_number: string;

  @ApiProperty()
  @IsNotEmpty()
  settlement_account_name: string;

  @ApiProperty()
  @IsNotEmpty()
  settlement_bank_name: string;
}
