import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateConsentDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  terms_accepted: boolean;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  privacy_policy_accepted: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  marketing_consent?: boolean;

  @ApiProperty({ example: 'v1.0' })
  @IsNotEmpty()
  @IsString()
  policy_version: string;

  @ApiProperty({ example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiProperty({ example: '127.0.0.1' })
  @IsOptional()
  @IsString()
  ip_address?: string;
}
