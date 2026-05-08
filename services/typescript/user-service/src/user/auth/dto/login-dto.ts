import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  browserName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  userAgent: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  os: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  platform: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  device_hash: string;
}
