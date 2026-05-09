import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, isString } from 'class-validator';

export class CreateAdminRoleDto {
  id: number;

  @IsString()
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  permissions: string[];

  created_at: string;

  updated_at: string;
}
