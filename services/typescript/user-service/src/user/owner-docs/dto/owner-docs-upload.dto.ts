import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class OwnerDocsUploadDto {
  @ApiProperty()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty()
  @IsNotEmpty()
  bvn: string;

  @ApiProperty()
  identification_doc_url?: string;

  @ApiProperty()
  proof_of_address_url?: string;
}
