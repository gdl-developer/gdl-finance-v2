import { IsOptional, IsString } from 'class-validator';

export class UpdateKycLevelDto {
  @IsString()
  @IsOptional()
  level_name: string;
}
