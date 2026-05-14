import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateCustomerAddressDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_state_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_country_cd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_zip: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postal_address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
