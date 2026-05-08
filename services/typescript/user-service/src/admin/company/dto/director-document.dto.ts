// dto/director-document.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DirectorDocType } from '../entities/director-document.entity';

export class CreateDirectorDocumentDto {
  @IsEnum(DirectorDocType)
  documentType: DirectorDocType;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  name?: string;
}
