import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateCustomerEmploymentDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employer_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  job_title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
