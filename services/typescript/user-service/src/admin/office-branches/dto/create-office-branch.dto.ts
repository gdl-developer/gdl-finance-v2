import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateOfficeBranchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branch_name: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  created_by: number;
}
