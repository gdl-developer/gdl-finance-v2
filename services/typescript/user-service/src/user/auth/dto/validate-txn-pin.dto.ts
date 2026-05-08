import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTxnPinDto {
  @IsNotEmpty()
  @IsString()
  session_token: string;

  @IsNotEmpty()
  @IsString()
  txn_pin: string;
}
