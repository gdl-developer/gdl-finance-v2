// dto/create-company-info.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  Matches,
} from 'class-validator';
import {
  BusinessType,
  ApprovalType,
} from '../interface/company-type.interface';

export class CreateCompanyInfoDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsString()
  rcNumber: string;

  @IsOptional()
  @IsString()
  tinNumber?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  cacStatus?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'incorporationDate must be a valid date string (YYYY-MM-DD)' },
  )
  incorporationDate?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsEnum(ApprovalType, {
    message:
      'approvalType must be one of: Any One Approver, All Approval, Sequential Approval',
  })
  approvalType?: ApprovalType;

  // Contact info
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?234[0-9]{10}$/, {
    message: 'Phone must be a valid Nigerian phone number',
  })
  phone: string;

  @IsOptional()
  website?: string;

  // Address
  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  street: string;

  @IsOptional()
  postalCode?: string;

  @IsOptional()
  country?: string;
}
