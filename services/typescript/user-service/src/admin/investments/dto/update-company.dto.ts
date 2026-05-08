import {
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

export class UpdateCompanyInfoDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  rcNumber?: string;

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
  incorporationDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  approvalType?: ApprovalType;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?234[0-9]{10}$/, {
    message: 'Phone must be a valid Nigerian phone number',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
