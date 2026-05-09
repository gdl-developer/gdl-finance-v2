import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Director } from './entities/director.entity';
import { CreateCompanyInfoDto } from './dto/create-company.dto';
import { AddDirectorDto } from './dto/directors.dto';
import { UploadDocumentDto } from './dto/documents.dto';
import { documentApprovaldtos } from './dto/documents-approval.dto';
import { CompanyStatus } from './interface/company-type.interface';
import { CompanyUserService } from 'src/company-user/company-user.service';
import { CreateCompanyUserDto } from 'src/company-user/dto/create-company-user.dto';
import { UpdateCompanyInfoDto } from './dto/update-company.dto';
import { Company_profile } from '../company/entities/company.entity';
import { CompanyDocument } from '../company/entities/document.entity';
import {
  ApprovalStatus,
  DocumentApproval,
} from '../company/entities/document-approval.entity';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(Company_profile)
    private readonly companyRepo: Repository<Company_profile>,

    @InjectRepository(CompanyDocument)
    private readonly docRepo: Repository<CompanyDocument>,

    @InjectRepository(Director)
    private readonly directorRepo: Repository<Director>,

    @InjectRepository(DocumentApproval)
    private readonly approvalRepo: Repository<DocumentApproval>,

    private readonly companyUserService: CompanyUserService, // 👈 inject here
  ) {}

  // ── Step 1: Create company info
  async createCompanyInfo(dto: CreateCompanyInfoDto): Promise<Company_profile> {
    const company = this.companyRepo.create({
      name: dto.companyName.trim(),
      tradingName: dto.tradingName?.trim(),
      businessType: dto.businessType,
      rcNumber: dto.rcNumber?.trim(),
      tinNumber: dto.tinNumber?.trim(),
      vatNumber: dto.vatNumber?.trim(),
      cacStatus: dto.cacStatus,
      incorporationDate: dto.incorporationDate
        ? new Date(dto.incorporationDate)
        : null,
      businessDescription: dto.businessDescription?.trim(),
      industry: dto.industry,
      approvalType: dto.approvalType,
      email: dto.email.toLowerCase(),
      phone: dto.phone?.trim(),
      website: dto.website?.trim(),
      businessAddress: dto.street?.trim(),
      city: dto.city?.trim(),
      state: dto.state?.trim(),
      postalCode: dto.postalCode?.trim(),
      country: dto.country || 'Nigeria',
    });
    return await this.companyRepo.save(company);
  }

  // ── Step X: Update company info (only if status = PENDING)
  async updateCompanyInfo(
    companyId: string,
    dto: UpdateCompanyInfoDto,
  ): Promise<Company_profile> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // ❌ block updates unless status is PENDING
    if (company.status !== CompanyStatus.PENDING) {
      throw new BadRequestException(
        `Company cannot be edited once status is ${company.status}`,
      );
    }

    // ✅ apply only changed fields
    const fieldsToUpdate = {
      ...(dto.companyName && { name: dto.companyName.trim() }),
      ...(dto.tradingName && { tradingName: dto.tradingName.trim() }),
      ...(dto.businessType && { businessType: dto.businessType }),
      ...(dto.rcNumber && { rcNumber: dto.rcNumber.trim() }),
      ...(dto.tinNumber && { tinNumber: dto.tinNumber.trim() }),
      ...(dto.vatNumber && { vatNumber: dto.vatNumber.trim() }),
      ...(dto.cacStatus && { cacStatus: dto.cacStatus }),
      ...(dto.incorporationDate && {
        incorporationDate: new Date(dto.incorporationDate),
      }),
      ...(dto.businessDescription && {
        businessDescription: dto.businessDescription.trim(),
      }),
      ...(dto.industry && { industry: dto.industry }),
      ...(dto.approvalType && { approvalType: dto.approvalType }),
      ...(dto.email && { email: dto.email.toLowerCase() }),
      ...(dto.phone && { phone: dto.phone.trim() }),
      ...(dto.website && { website: dto.website.trim() }),
      ...(dto.street && { businessAddress: dto.street.trim() }),
      ...(dto.city && { city: dto.city.trim() }),
      ...(dto.state && { state: dto.state.trim() }),
      ...(dto.postalCode && { postalCode: dto.postalCode.trim() }),
      ...(dto.country && { country: dto.country }),
    };

    // 🚨 nothing to update?
    if (Object.keys(fieldsToUpdate).length === 0) {
      throw new BadRequestException('No valid fields provided to update');
    }

    Object.assign(company, fieldsToUpdate);

    return await this.companyRepo.save(company);
  }
  // ── Step 2: Add director(s) with optional documents
  async addDirector(companyId: string, dto: AddDirectorDto): Promise<Director> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const director = this.directorRepo.create({
      ...dto,
      company,
      documents: dto.documents || [], // cascade ensures these get saved
    });

    return await this.directorRepo.save(director);
  }

  // ── Step 2: Add director(s) with optional documents
  async addDirectors(
    companyId: string,
    dtos: AddDirectorDto[],
  ): Promise<Director[]> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // create directors
    const directors = dtos.map((dto) =>
      this.directorRepo.create({
        ...dto,
        company,
        documents: dto.documents || [],
      }),
    );

    // save all directors at once
    return await this.directorRepo.save(directors);
  }

  // ── Step 3: Upload document(s)
  async uploadDocument(
    companyId: string,
    dto: UploadDocumentDto,
  ): Promise<CompanyDocument> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const doc = this.docRepo.create({ ...dto, company });
    return await this.docRepo.save(doc);
  }

  // ── Step 4: Approve a document (only when pending)
  async approveDocument(
    documentId: string,
    dto: documentApprovaldtos,
  ): Promise<CompanyDocument> {
    const document = await this.docRepo.findOne({
      where: { id: documentId },
      relations: ['approvals'],
    });

    if (!document) {
      this.logger.warn(
        `Document approval failed: Document ${documentId} not found`,
      );
      throw new NotFoundException('Document not found');
    }

    if (document.approvalStatus !== ApprovalStatus.PENDING) {
      this.logger.warn(
        `Document approval failed: Document ${documentId} is already ${document.approvalStatus.toLowerCase()}`,
      );
      throw new BadRequestException(
        `Document is already ${document.approvalStatus.toLowerCase()}`,
      );
    }

    if (!dto?.adminId) {
      this.logger.warn(
        `Document approval failed: Invalid admin ID for document ${documentId}`,
      );
      throw new NotFoundException('Not a recognised admin user');
    }

    // Save approval record
    const approval = this.approvalRepo.create({
      document,
      comment: dto.comment,
      approvedBy: { id: dto.adminId } as any, // assumes Admin entity exists
      approvalStatus: ApprovalStatus.APPROVED,
    });
    await this.approvalRepo.save(approval);

    // Update document status
    document.approvalStatus = ApprovalStatus.APPROVED;
    const savedDocument = await this.docRepo.save(document);

    this.logger.log(`Document ${documentId} approved by admin ${dto.adminId}`);

    return savedDocument;
  }

  // ── Step 4b: Reject a document (only when pending)
  async rejectDocument(
    documentId: string,
    dto: documentApprovaldtos,
  ): Promise<CompanyDocument> {
    const document = await this.docRepo.findOne({
      where: { id: documentId },
      relations: ['approvals'],
    });
    if (!document) throw new NotFoundException('Document not found');

    if (document.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Document is already ${document.approvalStatus.toLowerCase()}`,
      );
    }

    if (!dto?.adminId)
      throw new NotFoundException('Not a recognised admin user');

    // Save rejection record
    const rejection = this.approvalRepo.create({
      document,
      comment: dto.comment,
      approvedBy: { id: dto.adminId } as any, // assumes Admin entity exists
      approvalStatus: ApprovalStatus.REJECTED,
    });
    await this.approvalRepo.save(rejection);

    // Update document status
    document.approvalStatus = ApprovalStatus.REJECTED;
    return await this.docRepo.save(document);
  }

  // ── Fetch all documents of a company
  async getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['documents'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    console.log('company', company);

    // Flatten all director documents into one list
    const documents = company.documents;
    return documents;
  }

  async getCompanies(
    page = 1,
    limit = 10,
    filters?: {
      search?: string;
    },
  ) {
    const query = this.companyRepo.createQueryBuilder('company');

    // Search (companyName or tradingName)
    if (filters?.search) {
      query.andWhere(
        '(LOWER(company.name) LIKE LOWER(:search) OR LOWER(company.tradingName) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    // Ensure valid pagination
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.max(1, limit || 10);

    const [data, total] = await query
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .orderBy('company.createdAt', 'DESC')
      .getManyAndCount();

    return {
      items: data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ── Fetch single company with all details
  async getCompanyById(companyId: string): Promise<Company_profile> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['directors', 'directors.documents', 'documents'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  // ── Activate a company (with relaxed approval rules)
  async activateCompany(
    companyId: string,
    adminId: string,
  ): Promise<Company_profile> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['documents', 'directors', 'directors.documents'],
    });

    if (!company) {
      this.logger.warn(
        `Company activation failed: Company ${companyId} not found`,
      );
      throw new NotFoundException('Company not found');
    }

    if (company.isActive && company.status === CompanyStatus.ACTIVE) {
      this.logger.warn(
        `Company activation failed: Company ${companyId} is already active`,
      );
      throw new BadRequestException('Company is already active');
    }

    // 🔎 1. Check company documents
    const hasPendingCompanyDocs = company.documents.some(
      (doc) => doc.approvalStatus === ApprovalStatus.PENDING,
    );
    if (hasPendingCompanyDocs) {
      throw new BadRequestException(
        'Company cannot be activated: some company documents are still pending',
      );
    }

    const hasApprovedCompanyDocs = company.documents.some(
      (doc) => doc.approvalStatus === ApprovalStatus.APPROVED,
    );
    if (!hasApprovedCompanyDocs) {
      throw new BadRequestException(
        'Company cannot be activated: no company document is approved',
      );
    }

    // 🔎 2. Check directors' documents
    for (const director of company.directors) {
      const hasPendingDirectorDocs = director.documents.some(
        (doc) => doc.approvalStatus === ApprovalStatus.PENDING,
      );
      if (hasPendingDirectorDocs) {
        throw new BadRequestException(
          `Company cannot be activated: director ${director.id} has pending documents`,
        );
      }

      const hasApprovedDirectorDocs = director.documents.some(
        (doc) => doc.approvalStatus === ApprovalStatus.APPROVED,
      );
      if (!hasApprovedDirectorDocs) {
        throw new BadRequestException(
          `Company cannot be activated: director ${director.id} has no approved document`,
        );
      }
    }

    // 🔎 3. Status check before activation
    if (
      [
        CompanyStatus.PENDING,
        CompanyStatus.VERIFYING,
        CompanyStatus.SUSPENDED,
        CompanyStatus.INACTIVE,
      ].includes(company.status)
    ) {
      company.status = CompanyStatus.ACTIVE;
      company.isActive = true;
      company.verifiedBy = adminId;
      company.verifiedAt = new Date();
    } else {
      throw new BadRequestException(
        `Company cannot be activated from status: ${company.status}`,
      );
    }

    return await this.companyRepo.save(company);
  }

  // ── Deactivate a company
  async deactivateCompany(
    companyId: string,
    adminId: string,
  ): Promise<Company_profile> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    if (!company.isActive) {
      throw new BadRequestException('Company is already inactive');
    }

    company.isActive = false;
    company.status = CompanyStatus.INACTIVE;
    company.verifiedBy = adminId;
    company.verifiedAt = new Date();

    return await this.companyRepo.save(company);
  }

  // ── Step 5: Fetch full onboarding snapshot
  async getOnboardingData(companyId: string): Promise<Company_profile> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['directors', 'documents', 'documents.approvals'],
    });
    if (!company) throw new NotFoundException('Company not registered');
    return company;
  }

  /**
   * Create a new user under an existing company
   */
  async createCompanyUser(companyId: string, userDto: CreateCompanyUserDto) {
    // 1. Check if company exists
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.email) {
      const companyDomain = company.email.split('@')[1]?.toLowerCase();
      const userDomain = userDto.email.split('@')[1]?.toLowerCase();

      if (!companyDomain || !userDomain) {
        throw new BadRequestException('Invalid email format');
      }

      if (userDomain !== companyDomain) {
        throw new BadRequestException(
          `User email domain must match company domain (${companyDomain})`,
        );
      }
    }

    // 3. Delegate creation to CompanyUserService
    return this.companyUserService.create(companyId, userDto);
  }

  /**
   * Fetch all users of a company
   */
  async getCompanyUsers(companyId: string) {
    // validate company exists first
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.companyUserService.findAll(companyId);
  }

  /**
   * Suspend / deactivate a company user
   */
  async suspendCompanyUser(userId: string) {
    return this.companyUserService.remove(userId);
  }
}
