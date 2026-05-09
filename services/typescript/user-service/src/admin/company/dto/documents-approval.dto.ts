// dto/upload-document.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class documentApprovaldtos {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  adminId?: string;
}
