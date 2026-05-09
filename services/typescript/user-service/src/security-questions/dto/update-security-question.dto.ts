import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSecurityQuestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  question: string;
}
