import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsOptional,
} from "class-validator";

export class FundSubscriptionItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fund?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class FundSubscriptionDto {
  @ApiProperty({ type: [FundSubscriptionItemDto] })
  @IsArray()
  @IsNotEmpty()
  subscription: FundSubscriptionItemDto[];
}
