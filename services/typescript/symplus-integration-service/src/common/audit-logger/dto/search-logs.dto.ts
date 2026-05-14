import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SearchLogsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  tenant_code: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  LOG_EKY: string; // admin must have this key to view logs

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  per_page: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  page: any;
}
