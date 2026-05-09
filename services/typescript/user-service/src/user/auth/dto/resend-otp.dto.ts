import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(100, { message: 'Email address is too long' })
  email: string;
}
