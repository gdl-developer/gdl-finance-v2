import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import {
  ApprovalLevel,
  CompanyUserRole,
} from '../entities/company-user.entity';

export class CreateCompanyUserDto {
  @ApiProperty({ description: 'Company ID' })
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'First name of the company user' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the company user' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  lastName: string;

  @ApiProperty({
    description: 'Middle name of the company user',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  middleName?: string;

  @ApiProperty({ description: 'Email address of the company user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number of the company user' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]+$/, {
    message: 'Phone number must contain only digits and optionally a plus sign',
  })
  phone: string;

  @ApiProperty({
    description: 'Role of the company user',
    enum: CompanyUserRole,
  })
  @IsEnum(CompanyUserRole)
  @IsNotEmpty()
  role: CompanyUserRole;

  @ApiProperty({
    description: 'Approval level for approvers',
    enum: ApprovalLevel,
    required: false,
  })
  @IsEnum(ApprovalLevel)
  @IsOptional()
  approvalLevel?: ApprovalLevel;
}
