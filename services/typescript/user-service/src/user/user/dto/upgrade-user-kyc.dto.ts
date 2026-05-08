import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpgreadeUserKYCDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  level_number: number;
}
