import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class EnableTwoFactorDto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  verificationCode: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  verificationCode: string;

  @ApiProperty({ description: 'Current password for security verification' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
