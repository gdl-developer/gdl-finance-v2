import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  NotAcceptableException,
  NotFoundException,
  Res,
  UploadedFile,
  UseInterceptors,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { OwnerDocsService } from './owner-docs.service';
import { UpdateOwnerDocDto } from './dto/update-owner-doc.dto';
import { ApiTags } from '@nestjs/swagger';
import { OwnerDocsUploadDto } from './dto/owner-docs-upload.dto';
import {
  IdentificationDocType,
  OwnerDoc,
  OwnerDocsVerificationStatus,
  ProofOfAddressDocType,
} from './entities/owner-doc.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editFileName, imageFileFilter } from 'src/common/utils/upload-helper';
import { VerifyOwnerDocsDto } from './dto/verify-owner-doc.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { Request } from 'express';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Owner Docs')
@Controller('owner/docs')
export class OwnerDocsController {
  constructor(private readonly ownerDocsService: OwnerDocsService) {}

  @Patch('upload')
  @AuditLogger('UploadedFile')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './owner-docs',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    }),
  )
  async uploadedFile(
    @UploadedFile() file,
    @Body() fileUploadDto: OwnerDocsUploadDto,
  ) {
    const { bvn, user_id } = fileUploadDto;
    if (!file) throw new NotAcceptableException('No File Selected');

    const owner_docs = await this.ownerDocsService.findOne({
      bvn,
      user_id,
    });

    if (!owner_docs) throw new NotFoundException('User Docs Record Not Found');

    const file_url = file.filename.replace(/[ ]+/g, '');

    let update: OwnerDoc;
    if (fileUploadDto.identification_doc_url) {
      update = await this.ownerDocsService.update(owner_docs.id, {
        identification_doc_url: file_url,
      });
    }

    if (fileUploadDto.proof_of_address_url) {
      update = await this.ownerDocsService.update(owner_docs.id, {
        proof_of_address_url: file_url,
      });
    }

    return { success: true, data: update };
  }

  @Get('image/:imgpath')
  @AuditLogger('SeeUploadedFile')
  seeUploadedFile(@Param('imgpath') image, @Res() res) {
    return res.sendFile(image, { root: './owner-docs' });
  }

  @Get('doc/types')
  @AuditLogger('GetIndentityDocTypes')
  async docTypes() {
    const doc_types = Object.values(IdentificationDocType);
    return { success: true, data: doc_types };
  }

  @Get('doc/types/address/proof')
  @AuditLogger('GetProofOfAddrDocTypes')
  async docTypesAddr() {
    const doc_types = Object.values(ProofOfAddressDocType);
    return { success: true, data: doc_types };
  }

  @Get('doc/verify/statuses')
  @AuditLogger('GetDocVerifyStatuses')
  async verifyStatuses() {
    const status = Object.values(OwnerDocsVerificationStatus);
    return { success: true, data: status };
  }

  @Get()
  @AuditLogger('FindAllUserDocs')
  async findAllUserDocs() {
    const o_docs = await this.ownerDocsService.findAll();
    return { success: true, data: o_docs };
  }

  @Get('user/:user_id')
  @AuditLogger('FindOrCreateUserDocs')
  async findOne(@Req() request: Request) {
    const { user_id } = request['whoAmmI'];
    console.log('user_id from payload', request['whoAmmI']);
    const o_doc = await this.ownerDocsService.findOrCreateUserDocs(
      user_id,
      user_id,
    );
    return { success: true, data: o_doc };
  }

  @Patch(':id')
  @AuditLogger('UpdateUserDocs')
  async update(
    @Param('id') id: string,
    @Body() updateOwnerDocDto: UpdateOwnerDocDto,
    @Req() request: Request,
  ) {
    const { user_id, user_type } = request['whoAmmI'];
    console.log('user_id', user_id);
    const role = user_type?.toLowerCase();
    console.log('updateOwnerDocDto', updateOwnerDocDto);
    // Only prevent users from updating other users' docs
    // if (role === 'user' && user_id !== +id) {
    //   throw new ForbiddenException('Action Not Allowed');
    // }

    if (!['user', 'admin', 'super_admin'].includes(role)) {
      throw new ForbiddenException('UnIdentified User Type');
    }

    // Ensure docs exist or create them
    const o_doc = await this.ownerDocsService.findOrCreateUserDocs(
      user_id,
      updateOwnerDocDto.user_id,
    );

    // Update docs and sync flags
    const updated = await this.ownerDocsService.updateWithUserFlags(
      o_doc,
      updateOwnerDocDto,
    );
    return { success: true, data: updated };
  }

  @Patch('verify/:id')
  // @UseGuards(AbilitiesGuard)
  // @CheckAbilities({ action: Action.Read, subject: OwnerDoc })
  @AuditLogger('VerifyUserDocs')
  async verifyDocs(
    @Param('id') id: string,
    @Body() verifyOwnerDocsDto: VerifyOwnerDocsDto,
  ) {
    const docs = await this.ownerDocsService.verifyDocs(
      +id,
      verifyOwnerDocsDto,
    );

    return { success: true, data: docs };
  }
}
