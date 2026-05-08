import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserOneDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  confirm_password: string;
}
