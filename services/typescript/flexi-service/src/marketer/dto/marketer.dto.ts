import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMarketerDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  office_branch_name?: string;

  @IsOptional()
  office_branch_id?: number;
}
