import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  MinLength,
  IsString,
  IsEmail,
  IsOptional,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RegistrationChannels } from 'src/user/user/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
    },
  )
  password: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsNotEmpty()
  @MinLength(8)
  password_confirm: string;

  @ApiProperty({ example: 'Chrome' })
  @IsOptional()
  @IsString()
  browserName?: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ example: 'Windows', required: false })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({ example: 'Win32', required: false })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ example: 'unique-device-hash-value' })
  @IsOptional()
  @IsString()
  device_hash: string;

  @ApiProperty({ enum: RegistrationChannels })
  @IsNotEmpty()
  registration_channel: RegistrationChannels;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  terms_accepted?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  privacy_policy_accepted?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  marketing_consent?: boolean;

  @ApiProperty({ example: 'v1.0' })
  @IsOptional()
  @IsString()
  policy_version?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  agreement?: boolean;
}
