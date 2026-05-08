import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class LoginWithhTempPinDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  device_hash: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  pin: number;
}
