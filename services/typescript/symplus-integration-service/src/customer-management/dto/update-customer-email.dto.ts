import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UpdateCustomerEmailDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primary_email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  alternate_email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
