import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  FlexiRequestStatus,
  FlexiRequestType,
} from '../entities/flexi-request.enums';

export class CreateFlexiRequestDto {
  @ApiProperty({ enum: FlexiRequestType })
  @IsEnum(FlexiRequestType)
  request_type: FlexiRequestType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'BankOne account number for validation',
    required: false,
  })
  @IsOptional()
  @IsString()
  bank_one_account_number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipient_bank_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipient_account_number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipient_account_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenure?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  client_email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  client_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  client_first_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  client_last_name?: string;

  @ApiProperty({ description: 'Documents with type and URL', required: false })
  @IsOptional()
  @IsArray()
  documents?: Array<{
    url: string;
    type: string;
    fileName?: string;
    fileSize?: string;
  }>;

  @ApiProperty({
    description: 'ID of the marketer to assign to this request',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  marketer_id?: number;
}

export class UpdateFlexiRequestStatusDto {
  @ApiProperty()
  @IsEnum(['APPROVED', 'REJECTED', 'FUNDS_DISBURSED'])
  status: 'APPROVED' | 'REJECTED' | 'FUNDS_DISBURSED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

export class ConfirmExtensionPaymentDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  comment?: string;
}

export class InitiateExtensionDto {
  @ApiProperty()
  @IsString()
  extension_tenure: string;

  @ApiProperty()
  @IsNumber()
  extension_rate: number;
}
