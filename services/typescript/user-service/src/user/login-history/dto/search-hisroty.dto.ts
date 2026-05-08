import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class SearchHisDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  per_page: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  page: any;
}
