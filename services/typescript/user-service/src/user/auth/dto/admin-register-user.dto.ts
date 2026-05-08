import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  GenderTypes,
  MaritalStatuses,
} from 'src/user/user/entities/user.entity';

export class AdminRegisterUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  other_names: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  date_of_birth: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  gender: GenderTypes;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  marital_status: MaritalStatuses;

  @ApiProperty()
  @IsString()
  @IsOptional()
  referred_by: string; // called referral code from the front

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  nin: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  state: string;
}

/*
marital_status
gender
*/
