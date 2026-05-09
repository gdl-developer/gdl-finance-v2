// dto/verify-otp.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
} from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 8) // Adjust length based on your OTP format
  otp: string;

  @IsOptional()
  @IsString()
  browserName: string;

  @IsOptional()
  @IsString()
  userAgent: string;

  @IsOptional()
  @IsString()
  os: string;

  @IsOptional()
  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  device_hash: string;
}
