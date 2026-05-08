import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @IsNotEmpty()
  new_password: string;
}
