import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { UserType, UserAccountStatus } from '../entities/admin.entity';

export class CreateAdminDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  staffFirstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  staffLastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  role: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  business_unit: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  office_branch: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  user_type: UserType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  staffEmail: string;

  @IsNotEmpty()
  @IsOptional()
  @IsString()
  password?: string;

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
  @IsBoolean()
  activationStatus?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  account_status?: UserAccountStatus;
}
