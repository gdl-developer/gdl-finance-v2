import { PartialType } from '@nestjs/mapped-types';
import { CreateMarketerDto } from './create-marketer.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMarketerDto extends PartialType(CreateMarketerDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
