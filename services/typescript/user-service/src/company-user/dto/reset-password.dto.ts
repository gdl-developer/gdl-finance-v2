import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Old password' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'OTP code sent to email' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ description: 'Request token' })
  @IsString()
  @IsNotEmpty()
  requestToken: string;
}

export class CreateNewPasswordDto {
  @ApiProperty({ description: 'Email of the company user' })
  email: string;

  @ApiProperty({ description: 'New password' })
  newPassword: string;

  @ApiProperty({ description: 'OTP code sent to email' })
  otp: string;

  @ApiProperty({ description: 'Request token' })
  requestToken: string;
}
