import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../common/abstract.service';
import { VerifyOwnerDocsDto } from './dto/verify-owner-doc.dto';
import {
  OwnerDoc,
  OwnerDocsVerificationStatus,
} from './entities/owner-doc.entity';
import { UserAccount } from '../user/entities/user.entity';
import { UpdateOwnerDocDto } from './dto/update-owner-doc.dto';

@Injectable()
export class OwnerDocsService extends AbstractService {
  constructor(
    @InjectRepository(OwnerDoc)
    private readonly ownerDocRepository: Repository<OwnerDoc>,

    @InjectRepository(UserAccount) // 👈 inject UserAccount repo directly
    private readonly userAccountRepository: Repository<UserAccount>,
  ) {
    super(ownerDocRepository);
  }

  /**
   * Find existing document or create a new one if it doesn't exist
   */
  async findOrCreateUserDocs(
    user_id: number,
    user_id_from_payload?: number,
  ): Promise<OwnerDoc> {
    // 👇 Fetch user directly from repository
    const user = await this.userAccountRepository.findOne({
      where: { id: user_id_from_payload },
    });

    console.log(`Looking for documents for user ID:`, user);

    if (!user) {
      throw new NotFoundException(
        `User with ID ${user_id_from_payload} not found`,
      );
    }

    let docs = await this.findExisting(user_id_from_payload);

    if (!docs) {
      console.log(
        `No existing documents found for user ID: ${user_id}. Creating new record.`,
      );

      docs = await this.create({
        user_id: user_id_from_payload,
        full_name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
        owner_docs_verification_status:
          OwnerDocsVerificationStatus.NOT_VERIFIED,
      });
    }

    return docs;
  }

  async updateWithUserFlags(
    doc: OwnerDoc,
    updateOwnerDocDto: UpdateOwnerDocDto,
  ): Promise<OwnerDoc> {
    // Step 1: Update the owner_doc itself
    await this.update(doc.id, updateOwnerDocDto);
    const updatedDoc = await this.findOne(doc.id);

    console.log('Updated OwnerDoc:', updatedDoc);
    // Step 2: Determine flags
    const hasIdentityDoc = !!updatedDoc.identification_doc_url?.trim();
    const hasAddressDoc = !!updatedDoc.proof_of_address_url?.trim();

    // Step 3: Update the user_account flags
    await this.userAccountRepository.update(updateOwnerDocDto.user_id, {
      has_identity_documents: hasIdentityDoc,
      has_adress_documents: hasAddressDoc,
      documents_verified:
        hasIdentityDoc && hasAddressDoc
          ? updatedDoc.owner_docs_verification_status
          : OwnerDocsVerificationStatus.NOT_VERIFIED,
    });

    // Step 4: Return updated owner_doc
    return updatedDoc;
  }

  async findExisting(user_id: number): Promise<OwnerDoc | undefined> {
    return await this.findOne({ user_id });
  }

  async findOwnerDocs(doc_id: number, verifyOwnerDocsDto: VerifyOwnerDocsDto) {
    const docs = await this.findOne({
      id: doc_id,
      user_id: verifyOwnerDocsDto.user_id,
    });
    if (!docs) throw new NotFoundException('User Document Not Found');
    return docs;
  }

  private async updateUserVerificationState(updatedDoc: any) {
    const userId = updatedDoc.user_id;

    const hasIdentityDoc = !!updatedDoc.identification_doc_url?.trim();
    const hasAddressDoc = !!updatedDoc.proof_of_address_url?.trim();

    const allDocsVerified =
      hasIdentityDoc &&
      hasAddressDoc &&
      updatedDoc.owner_docs_verification_status ===
        OwnerDocsVerificationStatus.VERIFIED;

    console.log('Updating user ID', allDocsVerified);
    await this.userAccountRepository.update(userId, {
      has_identity_documents: hasIdentityDoc,
      has_adress_documents: hasAddressDoc,
      documents_verified: allDocsVerified
        ? OwnerDocsVerificationStatus.VERIFIED
        : OwnerDocsVerificationStatus.NOT_VERIFIED,
    });

    return {
      hasIdentityDoc,
      hasAddressDoc,
      documents_verified: allDocsVerified
        ? OwnerDocsVerificationStatus.VERIFIED
        : OwnerDocsVerificationStatus.NOT_VERIFIED,
    };
  }

  async verifyDocs(doc_id: number, verifyOwnerDocsDto: VerifyOwnerDocsDto) {
    const { verification_status, verified_by, verification_date } =
      verifyOwnerDocsDto;

    // Step 1: Update the document
    await this.update(doc_id, {
      owner_docs_verification_status: verification_status,
      verified_by,
      verification_date,
    });

    // Step 2: Fetch the freshly updated document (CRITICAL FIX)
    const updatedDoc = await this.findOne(doc_id);

    // Step 3: Cascade update to user
    const userUpdate = await this.updateUserVerificationState(updatedDoc);

    return {
      message: 'Document verification completed',
      updatedDoc,
      userVerificationStatus: userUpdate.documents_verified,
    };
  }
}
