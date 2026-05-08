// dto/add-director.dto.ts
import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDirectorDocumentDto } from './director-document.dto';

export class AddDirectorDto {
  @IsString()
  name: string;

  @IsString()
  position: string;

  // NIN: 11-digit numeric
  @IsOptional()
  @Matches(/^[0-9]{11}$/, { message: 'NIN must be 11 digits' })
  nin?: string;

  // BVN: 11-digit numeric
  @IsOptional()
  @Matches(/^[0-9]{11}$/, { message: 'BVN must be 11 digits' })
  bvn?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dob must be a valid date string (YYYY-MM-DD)' })
  dob?: string; // format should ideally be validated as YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^\+?234[0-9]{10}$/, {
    message: 'Phone must be a valid Nigerian phone number',
  })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  residentialAddress?: string;

  // ── Include director documents (cascaded save)
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectorDocumentDto)
  documents?: CreateDirectorDocumentDto[];
}
