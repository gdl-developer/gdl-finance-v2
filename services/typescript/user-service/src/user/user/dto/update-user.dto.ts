import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  GenderTypes,
  MaritalStatuses,
  UserAccountStatus,
} from '../entities/user.entity';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  user_avatar_url?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  country?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  marital_status?: MaritalStatuses;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  gender?: GenderTypes;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  user_token?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(UserAccountStatus)
  account_status: UserAccountStatus;
}
