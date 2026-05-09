import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetTempLoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_token: string;
}
