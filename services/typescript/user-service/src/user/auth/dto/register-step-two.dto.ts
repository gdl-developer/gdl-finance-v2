import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  GenderTypes,
  HowYouHeardAboutUs,
  MaritalStatuses,
} from 'src/user/user/entities/user.entity';

export class RegisterStepTwoDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  country_code: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  country: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  date_of_birth: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  gender: GenderTypes;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  marital_status: MaritalStatuses;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  nin: string;

  @IsOptional()
  @IsString()
  referred_by: string; // called referral code from the front

  @IsNotEmpty()
  @IsString()
  how_you_heard_about_us: HowYouHeardAboutUs;

  @IsOptional()
  @IsString()
  how_you_heard_about_us_specified: string; // only used for others

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  top_interested_product: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  other_interested_products: string;
}
