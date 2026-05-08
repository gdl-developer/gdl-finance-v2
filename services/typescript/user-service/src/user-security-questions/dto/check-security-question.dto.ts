import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CheckSecurityQuestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  question_id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  answer: string;
}
