import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserTwoDto {
  @IsNotEmpty()
  @IsEmail()
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
  country: string;

  @IsNotEmpty()
  @IsString()
  country_code: string;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
