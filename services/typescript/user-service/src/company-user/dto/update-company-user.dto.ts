import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  ApprovalLevel,
  CompanyUserRole,
  CompanyUserStatus,
} from '../entities/company-user.entity';

export class UpdateCompanyUserDto {
  @ApiProperty({
    description: 'First name of the company user',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 100)
  firstName?: string;

  @ApiProperty({
    description: 'Last name of the company user',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 100)
  lastName?: string;

  @ApiProperty({
    description: 'Middle name of the company user',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  middleName?: string;

  @ApiProperty({
    description: 'Email address of the company user',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Phone number of the company user',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9+]+$/, {
    message: 'Phone number must contain only digits and optionally a plus sign',
  })
  phone?: string;

  @ApiProperty({
    description: 'Role of the company user',
    enum: CompanyUserRole,
    required: false,
  })
  @IsEnum(CompanyUserRole)
  @IsOptional()
  role?: CompanyUserRole;

  @ApiProperty({
    description: 'Status of the company user',
    enum: CompanyUserStatus,
    required: false,
  })
  @IsEnum(CompanyUserStatus)
  @IsOptional()
  status?: CompanyUserStatus;

  @ApiProperty({
    description: 'Approval level for approvers',
    enum: ApprovalLevel,
    required: false,
  })
  @IsEnum(ApprovalLevel)
  @IsOptional()
  approvalLevel?: ApprovalLevel;

  @ApiProperty({ description: 'Position in the company', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ description: 'Department in the company', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ description: 'Optional permissions object', required: false })
  @IsOptional()
  permissions?: Record<string, boolean>;
}
