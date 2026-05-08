import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import {
  IsOptional,
  IsBoolean,
  IsDateString,
  IsString,
  IsEnum,
} from 'class-validator';
import { UserAccountStatus } from '../entities/admin.entity';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activationStatus?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  last_login?: Date | string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  account_status?: UserAccountStatus;
}
