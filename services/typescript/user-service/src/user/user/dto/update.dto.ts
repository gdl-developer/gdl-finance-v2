// dto/update-2fa-status.dto.ts
import { IsBoolean, IsEmail } from 'class-validator';

export class UpdateDto {
  @IsEmail()
  email: string;
}
