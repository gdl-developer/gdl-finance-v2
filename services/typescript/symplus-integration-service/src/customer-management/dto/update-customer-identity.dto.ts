import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateCustomerIDDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_type_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issue_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expiry_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuing_authority: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
