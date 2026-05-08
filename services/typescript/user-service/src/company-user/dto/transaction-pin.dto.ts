import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class SetTransactionPinDto {
  @ApiProperty({ description: 'Transaction PIN (6 digits)' })
  @IsNumber()
  @Min(100000)
  pin: number;
}

export class ValidateTransactionPinDto {
  @ApiProperty({ description: 'Transaction PIN (6 digits)' })
  @IsNumber()
  @Min(100000)
  pin: number;
}

export class ResetTransactionPinDto {
  @ApiProperty({ description: 'Email of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'New transaction PIN (6 digits)' })
  @IsNumber()
  @Min(100000)
  newPin: number;
}
