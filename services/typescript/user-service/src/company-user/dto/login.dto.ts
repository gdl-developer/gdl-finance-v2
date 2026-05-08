import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompanyUserLoginDto {
  @ApiProperty({ description: 'Email of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password of the company user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Device hash for device tracking' })
  @IsString()
  @IsNotEmpty()
  deviceHash: string;
}
