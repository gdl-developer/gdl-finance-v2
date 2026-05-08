import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBankOneAccountQuickDto {
  @IsString()
  @IsNotEmpty()
  TransactionTrackingRef: string;

  @IsString()
  @IsNotEmpty()
  AccountOpeningTrackingRef: string;

  @IsString()
  @IsNotEmpty()
  ProductCode: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  CustomerID?: string;

  @IsNotEmpty()
  @IsString()
  LastName: string;

  @IsNotEmpty()
  @IsString()
  OtherNames: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  BVN?: string;

  @IsNotEmpty()
  @IsString()
  PhoneNo: string;

  @IsNotEmpty()
  @IsNumber()
  Gender: number;

  @IsNotEmpty()
  @IsString()
  PlaceOfBirth: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  DateOfBirth: string | Date;

  @IsNotEmpty()
  @IsString()
  Address: string;

  @IsNotEmpty()
  @IsString()
  AccountOfficerCode: string;

  @IsNotEmpty()
  @IsString()
  Email: string;

  @IsNotEmpty()
  @IsNumber()
  NotificationPreference: number;

  @IsNotEmpty()
  @IsString()
  TransactionPermission: string;

  @IsNotEmpty()
  @IsString()
  AccountTier: string;
}
