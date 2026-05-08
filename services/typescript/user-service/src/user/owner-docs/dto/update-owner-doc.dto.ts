import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import {
  IdentificationDocType,
  ProofOfAddressDocType,
} from '../entities/owner-doc.entity';

export class UpdateOwnerDocDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsNotEmpty()
  identification_doc: IdentificationDocType;

  @IsOptional()
  @IsNotEmpty()
  proof_of_address_doc: ProofOfAddressDocType;

  @IsOptional()
  @IsNotEmpty()
  identification_number?: string;

  @IsOptional()
  @IsNotEmpty()
  identification_doc_url?: string;

  @IsOptional()
  @IsNotEmpty()
  proof_of_address_url?: string;
}
