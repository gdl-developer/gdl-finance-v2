import { IsNotEmpty, IsNumber } from 'class-validator';
import { OwnerDocsVerificationStatus } from '../entities/owner-doc.entity';

export class VerifyOwnerDocsDto {
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  verification_status: OwnerDocsVerificationStatus;

  @IsNotEmpty()
  verified_by: number;

  verification_date?: Date;
}
