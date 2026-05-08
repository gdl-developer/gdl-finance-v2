import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { FlexiRequestType } from '../../entities/request.enums';

export class CreateFlexiRequestDto {
  @IsEnum(FlexiRequestType)
  request_type: FlexiRequestType;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  bank_one_account_number?: string;

  @IsString()
  @IsOptional()
  recipient_bank_name?: string;

  @IsString()
  @IsOptional()
  recipient_account_number?: string;

  @IsString()
  @IsOptional()
  recipient_account_name?: string;

  @IsString()
  @IsOptional()
  tenure?: string;

  @IsString()
  @IsOptional()
  rate?: string;
}
