// dto/add-multiple-directors.dto.ts
import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize } from 'class-validator';
import { AddDirectorDto } from './directors.dto';

export class AddMultipleDirectorsDto {
  @ValidateNested({ each: true })
  @Type(() => AddDirectorDto)
  @ArrayMinSize(1, { message: 'At least one director must be provided' })
  directors: AddDirectorDto[];
}
