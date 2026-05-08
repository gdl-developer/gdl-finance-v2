import { IsString } from 'class-validator';

export class CreateVirtualAccountDto {
  @IsString()
  virtualaccountname: string;

  @IsString()
  amountcontrol: string;
}

export class CreateVirtualAccountResponseDto {
  responsecode: string;
  amount: string;
  virtualaccount: string;
  virtualaccountname: string;
  responsemessage: string;
  bankcode: string;
  amountcontrol: string;
}
