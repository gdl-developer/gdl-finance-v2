import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class BvnStatusCheckDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsString()
  wallet_ref: string;
}
