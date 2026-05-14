import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsArray, IsNotEmpty } from "class-validator";

export class FundAccountItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fund: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registrar: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  externalref: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reinvest: string;

  @ApiProperty()
  @IsNumber()
  reinvestpct: number;
}

export class FundAccountDto {
  @ApiProperty({ type: [FundAccountItemDto] })
  @IsArray()
  @IsNotEmpty()
  create: FundAccountItemDto[];
}
