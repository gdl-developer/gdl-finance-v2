// dto/update-2fa-status.dto.ts
import { IsBoolean, IsEmail } from 'class-validator';

export class Update2FAStatusDto {
  @IsEmail()
  email: string;

  @IsBoolean()
  is_2fa_enabled: boolean;
}
