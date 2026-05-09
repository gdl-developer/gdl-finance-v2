import { ApiProperty } from '@nestjs/swagger';

export class CreateNewPasswordDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  request_token: string;

  @ApiProperty()
  request_otp: string;

  @ApiProperty()
  otp: string;

  @ApiProperty({ example: 'NewStrongP@ss123' })
  new_password: string;
}
