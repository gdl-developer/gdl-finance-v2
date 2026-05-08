import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateKycLevelDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  level_number: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  level_name: string;
}
