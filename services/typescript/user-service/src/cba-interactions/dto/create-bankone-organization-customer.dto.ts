import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrganizationCustomerDto {
  @IsNotEmpty()
  @IsString()
  CompanyRegDate: string;

  @IsNotEmpty()
  @IsString()
  BusinessCommencementDate: string;

  @IsNotEmpty()
  @IsString()
  Name: string;

  @IsNotEmpty()
  @IsString()
  PhoneNo: string;

  @IsNotEmpty()
  @IsString()
  PostalAddress: string;

  @IsNotEmpty()
  @IsString()
  BusinessPhoneNo: string;

  @IsNotEmpty()
  @IsString()
  TaxIDNo: string;

  @IsNotEmpty()
  @IsString()
  BusinessName: string;

  @IsNotEmpty()
  @IsString()
  TradeName: string;

  @IsNotEmpty()
  @IsString()
  IndustrialSector: string;

  @IsNotEmpty()
  @IsString()
  Email: string;

  @IsNotEmpty()
  @IsString()
  Address: string;

  @IsNotEmpty()
  @IsString()
  ContactPersonName: string;

  @IsNotEmpty()
  @IsString()
  BusinessType: string;

  @IsNotEmpty()
  @IsString()
  BusinessNature: string;

  @IsNotEmpty()
  @IsString()
  WebAddress: string;

  @IsNotEmpty()
  @IsString()
  DateIncorporated: string;

  @IsNotEmpty()
  @IsString()
  RegistrationNumber: string;

  @IsNotEmpty()
  @IsArray() // to be revisited
  CustomerMembers: number[]; // ['1', '2']; // Customer ID created for Directors

  @IsNotEmpty()
  @IsArray() // to be revisited
  TheDirectors: number[]; // ['1', '2']; //Customer ID created for Directors
}
