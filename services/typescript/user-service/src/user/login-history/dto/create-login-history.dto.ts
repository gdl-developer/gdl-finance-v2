import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLoginHistoryDto {
  @IsNotEmpty()
  @IsString()
  user_id: number;

  @IsNotEmpty()
  @IsString()
  user_ip: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  user_location: string;

  @IsNotEmpty()
  @IsString()
  longitude: string;

  @IsNotEmpty()
  @IsString()
  latitude: string;
}
