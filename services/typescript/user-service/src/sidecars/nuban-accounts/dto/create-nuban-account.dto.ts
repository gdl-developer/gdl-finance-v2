import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { NUBANSource } from '../entities/nuban-account.entity';

export class CreateNubanAccountDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  nuban_account: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  nuban_source: NUBANSource;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  user_account_ref: string;
}
