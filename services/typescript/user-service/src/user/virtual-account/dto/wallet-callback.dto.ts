import { IsNotEmpty, IsString } from 'class-validator';

export class WalletCallbackDto {
  @IsString()
  @IsNotEmpty()
  originatoraccountnumber: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  originatorname: string;

  @IsString()
  narration: string;

  @IsString()
  @IsNotEmpty()
  craccountname: string;

  @IsString()
  @IsNotEmpty()
  paymentreference: string;

  @IsString()
  @IsNotEmpty()
  sessionid: string;

  @IsString()
  @IsNotEmpty()
  craccount: string;

  @IsString()
  @IsNotEmpty()
  bankcode: string;
}
