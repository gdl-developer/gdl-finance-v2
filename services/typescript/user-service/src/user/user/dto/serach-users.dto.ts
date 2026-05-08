import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class SearchUsersDto {
  @ApiProperty()
  @IsOptional()
  per_page: any;

  @ApiProperty()
  @IsOptional()
  page: any;

  @ApiProperty()
  @IsOptional()
  search: string;

  @ApiProperty()
  @IsOptional()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  endDate: string;

  @ApiProperty()
  @IsOptional()
  account_status: string;

  @ApiProperty()
  @IsOptional()
  phone: string;
}
