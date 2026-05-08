import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
  ParseUUIDPipe,
  ParseArrayPipe,
  Put,
  HttpStatus,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyInfoDto } from './dto/create-company.dto';
import { AddDirectorDto } from './dto/directors.dto';
import { UploadDocumentDto } from './dto/documents.dto';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { documentApprovaldtos } from './dto/documents-approval.dto';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateCompanyUserDto } from 'src/company-user/dto/create-company-user.dto';
import { UpdateCompanyInfoDto } from './dto/update-company.dto';
import { AddMultipleDirectorsDto } from './dto/add-multiple-directors.dto';
import { Director } from './entities/director.entity';
import { Company_profile } from '../company/entities/company.entity';

@ApiTags('Company Units')
@Controller('admin/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('create')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: Company_profile })
  async createCompany(@Body() dto: CreateCompanyInfoDto, @Res() res: Response) {
    const company = await this.companyService.createCompanyInfo(dto);

    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Company created successfully',
      data: company,
    };
    return res.status(200).json(resp);
  }

  @Get('all')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Company_profile })
  async getCompanies(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Res() res: Response,
    @Query('search') search?: string,
  ) {
    const result = await this.companyService.getCompanies(page, limit, {
      search,
    });
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Companies fetch successfully',
      data: result,
    };
    return res.status(200).json(resp);
  }

  @Post(':id/directors')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: Director })
  async addDirector(
    @Param('id') id: string,
    @Res() res: Response,
    @Body() dto: AddDirectorDto,
  ) {
    const response = await this.companyService.addDirector(id, dto);
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Directors successfully added',
      data: response,
    };
    return res.status(200).json(resp);
  }

  @Post(':id/directors/bulk')
  async addMultipleDirectors(
    @Param('id') id: string,
    @Body() dto: AddMultipleDirectorsDto,
  ) {
    const response = await this.companyService.addDirectors(id, dto.directors);

    return {
      success: true,
      status_code: 200,
      response_description: 'Directors successfully added',
      data: response,
    };
  }

  @Post(':id/documents')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: Company_profile })
  async uploadDocument(
    @Param('id') id: string,
    @Res() res: Response,
    @Body() dto: UploadDocumentDto,
  ) {
    const result = await this.companyService.uploadDocument(id, dto);
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Documents added successfully',
      data: result,
    };
    return res.status(200).json(resp);
  }

  @Post('documents/:id/approve')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Company_profile })
  approveDocument(
    @Param('id', ParseUUIDPipe) documentId: string,
    @Body() dto: documentApprovaldtos,
    @Request() req: any, // better: use a custom @CurrentUser decorator
  ) {
    const adminId = req.user?.id; // secure: comes from auth token/session
    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }
    return this.companyService.approveDocument(documentId, {
      ...dto,
      adminId,
    });
  }

  @Post('documents/:id/reject')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Company_profile })
  async rejectDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: documentApprovaldtos,
    @Request() req: any,
  ) {
    const adminId = req.user?.id; // from JWT/session
    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }
    return this.companyService.rejectDocument(id, { ...dto, adminId });
  }

  @Get(':id/documents')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Company_profile })
  async getCompanyDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const response = await this.companyService.getCompanyDocuments(id);
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Fetch company documents successfully',
      data: response,
    };
    return res.status(200).json(resp);
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Company_profile })
  async getCompanyById(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const response = await this.companyService.getCompanyById(id);

    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Companies fetch successfully',
      data: response,
    };
    return res.status(200).json(resp);
  }

  @Post(':id/activate')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Company_profile })
  async activateCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const adminId = req.user?.id; // from JWT/session
    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }
    return this.companyService.activateCompany(id, adminId);
  }

  @Patch(':id/update')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Company_profile })
  async updateCompanyInfo(
    @Param('id', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanyInfoDto,
    @Res() res: Response,
  ) {
    const updatedCompany = await this.companyService.updateCompanyInfo(
      companyId,
      dto,
    );

    const resp = {
      success: true,
      status_code: HttpStatus.OK,
      response_description: 'Company info successfully updated',
      data: updatedCompany,
    };

    return res.status(HttpStatus.OK).json(resp);
  }

  @Post(':id/deactivate')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Company_profile })
  async deactivateCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const adminId = req.user?.id; // from JWT/session
    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }
    return this.companyService.deactivateCompany(id, adminId);
  }

  /**
   */
  @Post(':companyId/users')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: Company_profile })
  async createCompanyUser(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body() userDto: CreateCompanyUserDto,
    @Res() res: Response,
  ) {
    console.log('companyId', companyId);
    const responseData = await this.companyService.createCompanyUser(
      companyId,
      userDto,
    );
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'create an account officer successfully',
      data: responseData,
    };
    return res.status(200).json(resp);
  }

  /**
   * Fetch all users of a company
   */
  @Get(':companyId/users')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Company_profile })
  async getCompanyUsers(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Res() res: Response,
  ) {
    const responseData = await this.companyService.getCompanyUsers(companyId);
    const resp = {
      success: true,
      status_code: 200,
      response_description: 'Fetch company account officers successfully',
      data: responseData,
    };
    return res.status(200).json(resp);
  }

  @Get(':id/onboarding')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Company_profile })
  getOnboarding(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.getOnboardingData(id);
  }
}
