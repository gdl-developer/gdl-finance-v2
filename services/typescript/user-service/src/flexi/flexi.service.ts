import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FlexiRequest } from './entities/flexi-request.entity';
import {
  FlexiRequestStatus,
  FlexiRequestType,
} from './entities/flexi-request.enums';
import { FlexiDocument } from './entities/flexi-document.entity';
import { FlexiAgent } from './entities/flexi-agent.entity';
import { FlexiLoginHistory } from './entities/flexi-login-history.entity';
import {
  CreateFlexiRequestDto,
  UpdateFlexiRequestStatusDto,
  InitiateExtensionDto,
} from './dto/flexi-request.dto';
import { CbaInteractionsService } from '../cba-interactions/cba-interactions.service';
import { AuditLoggerService } from '../common/audit-logger/audit-logger.service';
import { UserAccount } from '../user/user/entities/user.entity';
import { CreateFlexiAgentDto, AgentLoginDto } from './dto/create-agent.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { GdlMarketer } from './entities/gdl-marketer.entity';
import {
  MMFInvestmentRequest,
  MMFInvestmentRequestStatus,
} from '../user/investment-request/entities/investment-request.entity';
import { UserService } from '../user/user/user.service';
import { auth_actions_html } from '../common/utils/notification-templates/auth-actions-helper';
import { investment_request_html } from '../common/utils/notification-templates/investment-request-helper';
import { EnvService } from 'src/common/env.service';
import { JwtAuthUtilsService } from '../sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { Admin, UserType } from '../admin/admin/entities/admin.entity';
import { AuthRequestType } from '../user/auth/entities/auth.entity';
import * as crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { QuoreIdService } from './quore-id/quore-id.service';
import { ApprovalWorkflow } from '../admin/approval-workflow/entities/approval-workflow.entity';
import { FlexiApprovalHistory } from './entities/flexi-approval-history.entity';

const env_config = new EnvService().read();
const FRONT_END_BASE_URL =
  env_config.FLEXI_FRONTEND_BASE_URL || 'https://flexi.housemoni.ng';
const AWS_REGION = env_config.AWS_REGION;
const AWS_ACCESS_KEY_ID = env_config.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env_config.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = env_config.S3_BUCKET_NAME;
const SIGNED_URL_EXPIRATION = Number(env_config.SIGNED_URL_EXPIRATION || 900);

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

@Injectable()
export class FlexiService {
  private readonly logger = new Logger(FlexiService.name);

  constructor(
    @InjectRepository(FlexiRequest)
    private flexiRequestRepo: Repository<FlexiRequest>,
    @InjectRepository(FlexiDocument)
    private flexiDocumentRepo: Repository<FlexiDocument>,
    @InjectRepository(FlexiAgent)
    private flexiAgentRepo: Repository<FlexiAgent>,
    @InjectRepository(FlexiLoginHistory)
    private loginHistoryRepo: Repository<FlexiLoginHistory>,
    @InjectRepository(GdlMarketer)
    private readonly marketerRepo: Repository<GdlMarketer>,
    @InjectRepository(MMFInvestmentRequest)
    private readonly investmentRequestRepo: Repository<MMFInvestmentRequest>,
    @InjectRepository(ApprovalWorkflow)
    private readonly workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(FlexiApprovalHistory)
    private readonly approvalHistoryRepo: Repository<FlexiApprovalHistory>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly cbaInteractionsService: CbaInteractionsService,
    private readonly auditLoggerService: AuditLoggerService,
    private readonly userService: UserService,
    private readonly jwtAuthUtilsService: JwtAuthUtilsService,
    private readonly quoreIdService: QuoreIdService,
  ) {}

  async verifyCustomerBvn(bvn: string, payload: any): Promise<any> {
    return this.quoreIdService.verifyBvn(bvn, payload);
  }

  async getSignedDocumentUrl(storedValue: string): Promise<string> {
    try {
      let key = storedValue;

      // Check if storedValue is a full S3 URL and extract key
      if (
        storedValue.includes('amazonaws.com') ||
        storedValue.includes('http')
      ) {
        // If it's a signed URL, it might have query params etc.
        // We need to extract the path part which corresponds to the Key.
        // Format: https://bucket.s3.region.amazonaws.com/KEY
        // OR https://s3.region.amazonaws.com/bucket/KEY

        try {
          const urlObj = new URL(storedValue);
          const pathname = urlObj.pathname;
          let potentialKey = pathname.startsWith('/')
            ? pathname.substring(1)
            : pathname;

          // Extract bucket name from potentialKey if it's path-style
          // e.g. gdl-plus/flexi-documents/... -> flexi-documents/...
          if (potentialKey.startsWith(`${S3_BUCKET_NAME}/`)) {
            potentialKey = potentialKey.replace(`${S3_BUCKET_NAME}/`, '');
          }

          key = decodeURIComponent(potentialKey);
        } catch (e) {
          // Fallback if URL parsing fails, likely not a URL or already a key
          key = storedValue;
        }
      }

      if (!key || key.trim() === '') {
        return storedValue;
      }

      // Generate fresh signed URL
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // 1 hour expiration for view session
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to sign URL for key: ${storedValue}`, error);
      return storedValue;
    }
  }

  async createRequest(
    userPayload: any,
    dto: CreateFlexiRequestDto,
  ): Promise<FlexiRequest> {
    this.logger.log(
      `Creating Flexi Request. Initiator: ${userPayload.user_type} - ${userPayload.user_id}`,
    );

    let targetUserId: number;
    let agentId: number | null = null;
    const marketerId: number | null = dto.marketer_id || null;

    if (userPayload.user_type === 'FLEXI_AGENT') {
      agentId = userPayload.user_id;

      // If agent is creating, they MUST provide client details or specify a client
      if (dto.client_email) {
        const client = await this.userService.findOne({
          where: { email: dto.client_email },
        });

        if (!client) {
          // Create minimal user if not exists
          // For MVP, we'll try to create a basic user.
          // However, creating a user requires more validation (password etc).
          // For now, we will throw if user not found, prompting Agent to Register user first?
          // OR we auto-create with a temp password.

          // Let's auto-create a minimal user for the purpose of the request
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await this.userService.hashPassword(
            tempPassword,
          ); // Using public method if available or bcrypt directly

          // Note: accessing repo via service might be restricted.
          // We'll use userService.create if possible, but AbstractService create usually takes DTO.
          // Accessing repo directly via connection or protected prop is hacky.
          // Auto-create user
          const newUser = await this.userService.create({
            email: dto.client_email,
            first_name: dto.client_first_name || '',
            last_name: dto.client_last_name || '',
            phone: dto.client_phone || '',
            password: hashedPassword,
            device_hash: 'auto-generated-flexi',
            account_status: 'INACTIVE', // Using string enum value directly to avoid import issues if not available
            is_2fa_enabled: false,
            user_type: 'USER', // Default user type
            registration_channel: 'WEB',
          });

          targetUserId = newUser.id;
        } else {
          targetUserId = client.id;
        }
      } else {
        // Fallback: If agent didn't specify client
        throw new BadRequestException(
          'Client details (email) required for Agent-initiated request',
        );
      }
    } else {
      // Regular user
      targetUserId = userPayload.user_id;
      // Marketer might be in DTO
    }

    // 1. BankOne Validation
    if (dto.bank_one_account_number) {
      this.logger.log(
        `Validating BankOne Account: ${dto.bank_one_account_number}`,
      );
      // TODO: Implement actual call to CbaInteractionsService
    }

    // Assign Workflow (Get the 'Flexi Automation' workflow)
    const workflow = await this.workflowRepo.findOne({
      where: { module: 'Flexi Automation', isActive: true },
      relations: ['steps', 'steps.admin'],
      order: { id: 'DESC' }, // Get most recent if multiple (though unique constraint should prevent)
    });

    const request = this.flexiRequestRepo.create({
      user: { id: targetUserId } as any,
      ...dto,
      agent: agentId ? { id: agentId } : null,
      status: FlexiRequestStatus.PENDING_APPROVAL, // Default start state
      current_workflow_stage: workflow ? 'Approval Level 1' : 'Document Upload',
      workflow: workflow || null,
      current_approval_level: 1,
      documents:
        dto.documents?.map((doc) => {
          // Check if the URL sent from frontend is a full URL or a Key.
          // If it's a full URL (legacy behavior), we try to extract the key, or just save it.
          // Ideally, we save the key.
          // We will perform a check: if it contains amazonaws.com, we extract the key.
          let storageValue = doc.url;
          if (doc.url.includes('amazonaws.com')) {
            try {
              const urlObj = new URL(doc.url);
              storageValue = decodeURIComponent(urlObj.pathname.substring(1));
            } catch (e) {
              // ignore
            }
          }

          return {
            document_type: doc.type,
            document_url: storageValue, // Store KEY preferably
            file_name: doc.fileName || null,
            file_size: doc.fileSize || null,
          };
        }) || [],
      marketer: marketerId ? { id: marketerId } : null,
    });

    const tempSavedRequest = await this.flexiRequestRepo.save(request);

    // Evaluate and skip any non-matching branch-restricted levels immediately
    const savedRequest = await this.evaluateAndSkipLevels(tempSavedRequest.id);

    // 3. Audit Log
    try {
      await this.auditLoggerService.insert({
        user_id: targetUserId,
        user_type: userPayload.user_type || 'USER', // Enum string
        user_name: 'System User', // Placeholder if name not available
        roles: userPayload.roles || 'USER',
        action_performed: 'CREATE_FLEXI_REQUEST',
        ip_address: '0.0.0.0',
        attributes: JSON.stringify({
          requestId: savedRequest.id,
          type: dto.request_type,
          amount: dto.amount,
          ref: `FLEXI-${savedRequest.id}`,
          marketerId: dto.marketer_id,
          recipientBank: dto.recipient_bank_name,
          tenure: dto.tenure,
          rate: dto.rate,
        }),
      });
    } catch (e) {
      this.logger.error('Failed to log audit', e);
    }

    // 4. Notifications
    try {
      // Refresh request with user and marketer relations for notification
      const fullRequest = await this.flexiRequestRepo.findOne({
        where: { id: savedRequest.id },
        relations: [
          'user',
          'marketer',
          'agent',
          'workflow',
          'workflow.steps',
          'workflow.steps.admin',
        ],
      });

      if (fullRequest) {
        // A. Notify Marketer if present
        if (fullRequest.marketer) {
          await this.sendApprovalNotification(
            fullRequest,
            'MARKETER',
            null,
            fullRequest.marketer,
          );
        }

        // B. Notify the first active approver
        if (
          fullRequest.status === FlexiRequestStatus.PENDING_APPROVAL &&
          fullRequest.workflow
        ) {
          const steps = [...fullRequest.workflow.steps].sort(
            (a, b) => a.level - b.level,
          );
          const currentStep = steps.find(
            (s) => s.level === fullRequest.current_approval_level,
          );
          if (currentStep && currentStep.admin) {
            await this.sendApprovalNotification(
              fullRequest,
              'NEXT_APPROVER',
              currentStep.admin,
            );
          }
        }
      }
    } catch (e) {
      this.logger.error('Failed to send initial notifications', e);
    }

    return savedRequest;
  }

  async getUserRequests(userPayload: any, queryParams: any = {}): Promise<any> {
    const { page = 1, limit = 10, search, status } = queryParams;
    const skip = (page - 1) * limit;

    const queryBuilder = this.flexiRequestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.marketer', 'marketer')
      .leftJoinAndSelect('request.agent', 'agent')
      .leftJoinAndSelect('request.documents', 'documents')
      .orderBy('request.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    // Filter by User
    if (userPayload.user_type === 'FLEXI_AGENT') {
      queryBuilder.andWhere('request.agent_id = :agentId', {
        agentId: userPayload.user_id,
      });
    } else {
      queryBuilder.andWhere('request.user_id = :userId', {
        userId: userPayload.user_id,
      });
    }

    // Search Logic
    if (search) {
      queryBuilder.andWhere(
        '(request.recipient_account_name LIKE :search OR request.recipient_bank_name LIKE :search OR request.recipient_account_number LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Status Filter
    if (status) {
      if (status === 'PENDING') {
        queryBuilder.andWhere('request.status LIKE :statusPattern', {
          statusPattern: 'PENDING%',
        });
      } else {
        queryBuilder.andWhere('request.status = :status', { status });
      }
    }

    const [requests, total] = await queryBuilder.getManyAndCount();

    // Sign URLs on Read (Paginated)
    for (const req of requests) {
      if (req.documents) {
        for (const doc of req.documents) {
          doc.document_url = await this.getSignedDocumentUrl(doc.document_url);
        }
      }
    }

    return {
      data: requests,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        last_page: Math.ceil(total / limit),
      },
    };
  }

  async getPendingRequestsForAdmin(
    adminId: number,
    queryParams: any = {},
  ): Promise<any> {
    const page = Number(queryParams.page) || 1;
    const limit = Number(queryParams.limit) || 10;
    const search = queryParams.search;
    const skip = (page - 1) * limit;

    console.log('FlexiService: getPendingRequestsForAdmin called with:', {
      adminId,
      page,
      limit,
      search,
      skip,
    });

    const queryBuilder = this.flexiRequestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.workflow', 'appWorkflow')
      .leftJoinAndSelect('appWorkflow.steps', 'workflowSteps')
      .leftJoinAndSelect('workflowSteps.admin', 'stepAdmin') // Join admin to step
      .leftJoinAndSelect('request.marketer', 'marketer')
      .leftJoinAndSelect('marketer.office_branch', 'marketerBranch')
      .leftJoinAndSelect('request.agent', 'agent')
      .leftJoinAndSelect('request.documents', 'reqDocuments')
      .where('request.status = :status', {
        status: FlexiRequestStatus.PENDING_APPROVAL,
      })
      .andWhere('workflowSteps.level = request.current_approval_level');

    // Branch matching based on workflow step configuration
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('(workflowSteps.enforce_branch_restriction = false)').orWhere(
          '(workflowSteps.enforce_branch_restriction = true AND marketer.office_branch_id IS NOT NULL AND marketer.office_branch_id = (SELECT branch_id FROM admin WHERE staffId = :adminId))',
          { adminId: Number(adminId) },
        );
      }),
    );

    queryBuilder
      .andWhere(
        '(workflowSteps.adminId = :adminId OR stepAdmin.staffId = :adminId)',
        { adminId: Number(adminId) },
      ) // Check both FK and joined entity ID
      .orderBy('request.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    console.log('FlexiService: SQL:', queryBuilder.getSql());
    console.log('FlexiService: Parameters:', queryBuilder.getParameters());

    if (search) {
      queryBuilder.andWhere(
        '(request.recipient_account_name LIKE :search OR request.recipient_bank_name LIKE :search OR request.recipient_account_number LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [requests, total] = await queryBuilder.getManyAndCount();

    // Sign URLs
    for (const req of requests) {
      if (req.documents) {
        for (const doc of req.documents) {
          doc.document_url = await this.getSignedDocumentUrl(doc.document_url);
        }
      }
    }

    return {
      data: requests,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        last_page: Math.ceil(total / limit),
      },
    };
  }

  async diagnosePendingRequests(adminId: number): Promise<any> {
    const requests = await this.flexiRequestRepo.find({
      where: { status: FlexiRequestStatus.PENDING_APPROVAL },
      relations: ['workflow', 'workflow.steps'],
    });

    return requests.map((req) => ({
      reqId: req.id,
      status: req.status,
      current_approval_level: req.current_approval_level,
      workflowId: req.workflow?.id,
      steps: req.workflow?.steps?.map((s) => ({
        stepId: s.id,
        level: s.level,
        adminId: s.adminId,
      })),
      adminIdToMatch: adminId,
      match: req.workflow?.steps?.find(
        (s) =>
          s.level === req.current_approval_level &&
          Number(s.adminId) === Number(adminId),
      )
        ? 'MATCH FOUND'
        : 'NO MATCH',
    }));
  }

  async getRequestById(id: number): Promise<FlexiRequest> {
    const request = await this.flexiRequestRepo.find({
      where: { id },
      relations: ['marketer', 'agent', 'documents', 'user', 'workflow'],
    });
    if (!request || request.length === 0)
      throw new NotFoundException('Flexi Request not found');

    const req = request[0];

    // Sign URLs on Read
    if (req.documents) {
      for (const doc of req.documents) {
        doc.document_url = await this.getSignedDocumentUrl(doc.document_url);
      }
    }

    return req;
  }

  async uploadDocument(
    file: any,
    documentType: string,
    user: any,
  ): Promise<any> {
    this.logger.log(
      `Uploading document: ${file.originalname} (${documentType}) for user: ${user.user_id}`,
    );

    // File Upload Validation fix: Strict MIME and type checking
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPG, PNG, and PDF are allowed.',
      );
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExt = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      throw new BadRequestException('Invalid file extension.');
    }

    try {
      // Generate secure S3 key
      const timestamp = Date.now();
      const sanitizedFileName = file.originalname.replace(
        /[^a-zA-Z0-9.-]/g,
        '_',
      );
      const key = `flexi-documents/${user.user_id}/${documentType}/${timestamp}-${sanitizedFileName}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      });

      await s3Client.send(uploadCommand);
      this.logger.log(`File uploaded successfully to S3: ${key}`);

      // Generate presigned URL for secure access (7 days expiry for immediate preview)
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 60 * 60 * 24 * 7,
      });

      return {
        url: signedUrl,
        key: key, // Return Key explicitly
        documentType: documentType,
        fileName: file.originalname,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async updateStatus(
    id: number,
    adminId: number,
    dto: UpdateFlexiRequestStatusDto,
  ): Promise<FlexiRequest> {
    const request = await this.flexiRequestRepo.findOne({
      where: { id },
      relations: [
        'user',
        'documents',
        'workflow',
        'workflow.steps',
        'workflow.steps.admin',
        'marketer',
        'marketer.office_branch',
      ],
    });

    if (!request) throw new NotFoundException('Flexi Request not found');

    // Enforce payment confirmation for extensions
    if (
      request.is_extension_active &&
      !request.extension_payment_confirmed &&
      dto.status === 'APPROVED'
    ) {
      throw new ForbiddenException(
        'Extension rate payment must be confirmed before proceeding with approval',
      );
    }

    // Validation for Workflow
    let steps = [];
    let currentStep = null;

    if (request.workflow) {
      if (!request.workflow.steps || request.workflow.steps.length === 0) {
        throw new BadRequestException('Approval workflow has no steps defined');
      }

      const currentLevel = request.current_approval_level || 1;
      steps = [...request.workflow.steps].sort((a, b) => a.level - b.level);
      currentStep = steps.find((s) => s.level === currentLevel);

      if (!currentStep) {
        // If no step found for current level, maybe workflow changed or completed?
        this.logger.warn(
          `No approval step found for level ${currentLevel} on request ${id}`,
        );
      } else {
        // Check if admin is assigned to this step
        if (!currentStep.admin) {
          throw new BadRequestException(
            `No admin assigned to approval level ${currentLevel}. Please contact support.`,
          );
        }

        // Check if admin is authorized
        if (Number(currentStep.admin.staffId) !== Number(adminId)) {
          this.logger.debug(
            `Admin ID mismatch. Expected: ${currentStep.admin.staffId}, Found: ${adminId}`,
          );
          throw new ForbiddenException(
            'You are not authorized to approve this step',
          );
        }

        // Branch check based on workflow step configuration
        if (currentStep.enforce_branch_restriction) {
          if (request.marketer && request.marketer.office_branch_id) {
            const admin = await this.adminRepo.findOne({
              where: { staffId: adminId },
              relations: ['office_branch'],
            });
            if (
              admin &&
              admin.office_branch &&
              admin.office_branch.id !== request.marketer.office_branch_id
            ) {
              throw new ForbiddenException(
                `This request is restricted to the ${request.marketer.office_branch.branch_name} branch`,
              );
            }
          }
        }
      }
    }

    // Logic
    let newStatus = request.status;
    let isFinalApproval = false;

    if (dto.status === 'APPROVED') {
      if (request.workflow && request.workflow.steps.length > 0) {
        const maxLevel = Math.max(
          ...request.workflow.steps.map((s) => s.level),
        );
        if (request.current_approval_level < maxLevel) {
          // Move to next level
          request.current_approval_level += 1;
          request.current_workflow_stage = `Approval Level ${request.current_approval_level}`;
          newStatus = FlexiRequestStatus.PENDING_APPROVAL;
        } else {
          // Final level reached -> Auto Transition to FUNDS_DISBURSED
          isFinalApproval = true;
          newStatus = FlexiRequestStatus.FUNDS_DISBURSED;
          request.current_workflow_stage = 'Funds Disbursed';

          // Set Disbursed At
          request.disbursed_at = new Date();

          // Calculate Expiry Date based on Tenure
          if (request.tenure) {
            // Expected format "30 Days", "60 Days" etc.
            const days = parseInt(request.tenure, 10);
            if (!isNaN(days)) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + days);
              request.expiry_date = expiryDate;
            }
          }
        }
      } else {
        // No workflow, immediate disbursement
        isFinalApproval = true;
        newStatus = FlexiRequestStatus.FUNDS_DISBURSED;
        request.current_workflow_stage = 'Funds Disbursed';

        request.disbursed_at = new Date();
        if (request.tenure) {
          const days = parseInt(request.tenure, 10);
          if (!isNaN(days)) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            request.expiry_date = expiryDate;
          }
        }
      }
    } else if (dto.status === 'REJECTED') {
      newStatus = FlexiRequestStatus.REJECTED;
      request.current_workflow_stage = 'Rejected';
    } else if (dto.status === 'FUNDS_DISBURSED') {
      newStatus = FlexiRequestStatus.FUNDS_DISBURSED;
      request.current_workflow_stage = 'Funds Disbursed';

      // Set Disbursed At
      request.disbursed_at = new Date();

      // Calculate Expiry Date based on Tenure
      if (request.tenure) {
        // Expected format "30 Days", "60 Days" etc.
        const days = parseInt(request.tenure, 10);
        if (!isNaN(days)) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + days);
          request.expiry_date = expiryDate;
        }
      }
    }

    // Apply Changes
    request.status = newStatus;
    if (isFinalApproval) {
      request.approved_by = adminId;
      request.approved_at = new Date();
    }
    if (newStatus === FlexiRequestStatus.REJECTED) {
      request.rejected_by = adminId;
      request.rejection_reason = dto.rejection_reason;
    }

    const saved = await this.flexiRequestRepo.save(request);

    // Record History
    const history = this.approvalHistoryRepo.create({
      request: saved,
      admin: { staffId: adminId } as any, // Use staffId
      level: request.workflow
        ? dto.status === 'APPROVED'
          ? isFinalApproval
            ? request.current_approval_level
            : request.current_approval_level - 1
          : request.current_approval_level
        : 1,
      status:
        dto.status === 'APPROVED'
          ? isFinalApproval
            ? FlexiRequestStatus.FUNDS_DISBURSED
            : FlexiRequestStatus.APPROVED
          : dto.status === 'REJECTED'
          ? FlexiRequestStatus.REJECTED
          : dto.status === 'FUNDS_DISBURSED'
          ? FlexiRequestStatus.FUNDS_DISBURSED
          : (dto.status as FlexiRequestStatus),
      comment:
        dto.rejection_reason ||
        (dto.status === 'APPROVED'
          ? isFinalApproval
            ? 'Approved & Disbursed'
            : 'Approved'
          : dto.status === 'FUNDS_DISBURSED'
          ? 'Funds Disbursed'
          : 'Rejected'),
    });

    await this.approvalHistoryRepo.save(history);

    // Notifications
    try {
      if (dto.status === 'APPROVED') {
        if (!isFinalApproval) {
          // Notify next approver
          const steps = [...request.workflow.steps].sort(
            (a, b) => a.level - b.level,
          );
          const nextStep = steps.find(
            (s) => s.level === request.current_approval_level,
          );
          if (nextStep && nextStep.admin) {
            await this.sendApprovalNotification(
              saved,
              'NEXT_APPROVER',
              nextStep.admin,
            );
          }
        } else {
          // Final approval -> Auto send Disbursed email instead of Final Approval
          await this.sendApprovalNotification(saved, 'FUNDS_DISBURSED');
        }
      } else if (dto.status === 'REJECTED') {
        // Rejection - notify requester
        await this.sendApprovalNotification(saved, 'REJECTED');
      } else if (dto.status === 'FUNDS_DISBURSED') {
        // Disbursement - notify requester
        await this.sendApprovalNotification(saved, 'FUNDS_DISBURSED');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send approval notification: ${error.message}`,
      );
    }

    // Audit
    await this.auditLoggerService.insert({
      user_id: adminId,
      user_type: 'ADMIN',
      user_name: 'Admin User',
      roles: 'ADMIN',
      action_performed: `FLEXI_REQUEST_${dto.status}_LEVEL_${history.level}`,
      ip_address: '0.0.0.0',
      attributes: JSON.stringify({
        requestId: id,
        reason: dto.rejection_reason,
        ref: `FLEXI-${id}`,
        workflow_level: history.level,
      }),
    });

    let finalSaved = saved;

    if (dto.status === 'APPROVED' && !isFinalApproval) {
      finalSaved = await this.evaluateAndSkipLevels(saved.id, adminId);
    }

    // Now if the stage has reached FUNDS_DISBURSED due to skipping to the end, send notification.
    if (
      finalSaved.status === FlexiRequestStatus.FUNDS_DISBURSED &&
      saved.status !== FlexiRequestStatus.FUNDS_DISBURSED
    ) {
      await this.sendApprovalNotification(finalSaved, 'FUNDS_DISBURSED');
    }

    return finalSaved;
  }

  async initiateExtension(
    id: number,
    dto: InitiateExtensionDto,
  ): Promise<FlexiRequest> {
    const request = await this.flexiRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Flexi Request not found');

    if (request.status !== FlexiRequestStatus.FUNDS_DISBURSED) {
      throw new BadRequestException(
        'Can only extend tenure for disbursed requests',
      );
    }

    request.extension_tenure = dto.extension_tenure;
    request.extension_rate = dto.extension_rate;
    request.extension_amount =
      Number(request.amount) * (Number(dto.extension_rate) / 100);
    request.is_extension_active = true;
    request.extension_payment_confirmed = false;
    request.current_approval_level = 1;
    request.status = FlexiRequestStatus.PENDING_APPROVAL;
    request.current_workflow_stage = 'Approval Level 1';

    return await this.flexiRequestRepo.save(request);
  }

  async confirmExtensionPayment(
    id: number,
    adminId: number,
  ): Promise<FlexiRequest> {
    const request = await this.flexiRequestRepo.findOne({
      where: { id },
      relations: ['workflow', 'workflow.steps', 'workflow.steps.admin'],
    });
    if (!request) throw new NotFoundException('Flexi Request not found');

    if (!request.is_extension_active) {
      throw new BadRequestException(
        'No active extension initiation found for this request',
      );
    }

    if (!request.workflow || !request.workflow.steps) {
      throw new BadRequestException('No workflow assigned to this request');
    }

    const steps = [...request.workflow.steps].sort((a, b) => a.level - b.level);
    const firstStep = steps.find((s) => s.level === 1);

    if (!firstStep || !firstStep.admin) {
      throw new BadRequestException(
        'No level 1 admin assigned to the workflow',
      );
    }

    if (Number(firstStep.admin.staffId) !== Number(adminId)) {
      throw new ForbiddenException(
        'Only the level 1 approver can confirm the extension payment',
      );
    }

    request.extension_payment_confirmed = true;
    const saved = await this.flexiRequestRepo.save(request);

    // Audit log
    await this.auditLoggerService.insert({
      user_id: adminId,
      user_type: 'ADMIN',
      user_name: 'Admin User',
      roles: 'ADMIN',
      action_performed: 'CONFIRM_EXTENSION_PAYMENT',
      ip_address: '0.0.0.0',
      attributes: JSON.stringify({
        requestId: id,
        ref: `FLEXI-${id}`,
        amount: request.extension_amount,
      }),
    });

    return saved;
  }

  // --- Agent Management ---

  async createAgent(dto: CreateFlexiAgentDto): Promise<FlexiAgent> {
    this.logger.log(`Creating Flexi Agent: ${dto.email}`);

    // Check availability
    // Check availability
    const existingEmail = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });
    if (existingEmail)
      throw new BadRequestException(`Email ${dto.email} already exists`);

    if (dto.phone) {
      const existingPhone = await this.flexiAgentRepo.findOne({
        where: { phone: dto.phone },
      });
      if (existingPhone)
        throw new BadRequestException(
          `Phone number ${dto.phone} already exists`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const newAgent = this.flexiAgentRepo.create({
      ...dto,
      password: hashedPassword,
      otp_code: Math.floor(100000 + Math.random() * 900000).toString(), // 6 digit OTP
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    });

    const saved = await this.flexiAgentRepo.save(newAgent);

    // Send OTP via Email
    await this.sendAgentOtp(saved);
    this.logger.log(`OTP for ${saved.email}: ${newAgent.otp_code}`);

    // Remove sensitive info
    const { password, otp_code, ...result } = saved;
    return result as FlexiAgent;
  }

  async verifyEmail(dto: { email: string; otp: string }): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    // OTP bypass fix: Always require OTP even if email is already verified
    // if (agent.is_email_verified) return this.signAgentToken(agent);

    if (!agent.otp_code || agent.otp_code !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > agent.otp_expires_at) {
      throw new BadRequestException('OTP has expired');
    }

    agent.is_email_verified = true;
    agent.otp_code = null;
    agent.otp_expires_at = null;
    await this.flexiAgentRepo.save(agent);

    return this.signAgentToken(agent);
  }

  async resendOtp(dto: { email: string }): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    if (agent.is_email_verified)
      throw new BadRequestException('Email already verified');

    // Generate new OTP
    agent.otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    agent.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await this.flexiAgentRepo.save(agent);

    // Send OTP via Email
    await this.sendAgentOtp(agent);
    this.logger.log(`Resent OTP for ${agent.email}: ${agent.otp_code}`);

    return { success: true, message: 'OTP resent successfully' };
  }

  private async sendAgentOtp(agent: FlexiAgent) {
    try {
      const message1 = `You’ve received this message because you registered as a GDL Flexi Agent. Please use the OTP below to verify your email address.`;
      const message2 = `If you did not make this request, please disregard this email.`;

      const data = {
        heading_logo: ``,
        heading: `Verify Your Email`,
        message1,
        message2,
        message3: ``,
        request_otp: agent.otp_code,
        url: `${FRONT_END_BASE_URL}`,
        type: 'VERIFY_EMAIL', // Custom type or reuse Generic
      };

      const html = auth_actions_html(data);

      const notification_data = {
        sender: 'GDL',
        title: 'Verify Your Email - GDL Flexi',
        description: 'Email Verification Code',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: 0, // Flexi Agent doesn't have a user_id in main table yet
        recipients_email: agent.email,
        recipients_phone_number: agent.phone,
        request_ref: `FLEXI_OTP_${agent.id}_${Date.now()}`,
        message: `${message1} ${message2}`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'email_verification',
      };

      // Using userService proxy to send notification
      await this.userService.sendUserAuthNotifications(notification_data);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP email to ${agent.email}`,
        error.stack,
      );
      // Don't block flow if email fails, but log it
    }
  }

  // --- Agent Methods ---

  async getAgentProfile(agentId: number): Promise<FlexiAgent> {
    const agent = await this.flexiAgentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    if (agent.avatar_url) {
      agent.avatar_url = await this.getSignedDocumentUrl(agent.avatar_url);
    }

    return agent;
  }

  async updateProfile(email: string, dto: any): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({ where: { email } });
    if (!agent) throw new NotFoundException('Agent not found');

    // If BVN is being updated, check it's not already in use by another agent
    if (dto.bvn && dto.bvn !== agent.bvn) {
      const existingBvn = await this.flexiAgentRepo.findOne({
        where: { bvn: dto.bvn },
      });
      if (existingBvn && existingBvn.id !== agent.id)
        throw new BadRequestException(
          'This BVN is already registered to another agent. Each agent must have a unique BVN.',
        );
    }

    // Mass Assignment fix: Explicitly allow only specific fields for update
    const allowedFields = [
      'date_of_birth',
      'country',
      'state',
      'city',
      'address',
      'first_name',
      'last_name',
      'phone',
      'position',
      'company_name',
      'gender',
      'marital_status',
      'avatar_url',
    ];

    Object.keys(dto).forEach((key) => {
      if (allowedFields.includes(key)) {
        agent[key] = dto[key];
      }
    });

    // Object.assign(agent, dto); // Vulnerable line removed

    // Simple completion check logic
    if (
      agent.bvn &&
      agent.date_of_birth &&
      agent.address &&
      agent.country &&
      agent.state &&
      agent.city
    ) {
      agent.profile_completed = true;
    }

    await this.flexiAgentRepo.save(agent);

    return {
      success: true,
      message: 'Profile updated successfully',
      agent: agent,
    };
  }

  async loginAgent(
    dto: AgentLoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });

    if (!agent) throw new NotFoundException('Invalid credentials');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(dto.password, agent.password);

    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!agent.is_email_verified) {
      // Resend OTP automatically
      await this.resendOtp({ email: agent.email });

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Email not verified. A new OTP has been sent.',
        error: 'Unauthorized',
        action: 'VERIFY_EMAIL',
      });
    }

    // Record Login History
    if (ip || userAgent) {
      await this.recordLoginHistory(agent, ip, userAgent);
    }

    return this.signAgentToken(agent);
  }

  async recordLoginHistory(agent: FlexiAgent, ip: string, userAgent: string) {
    try {
      const history = this.loginHistoryRepo.create({
        agent,
        ip_address: ip,
        user_agent: userAgent,
        status: 'Account was accessed',
      });
      await this.loginHistoryRepo.save(history);
    } catch (error) {
      this.logger.error('Failed to record login history', error.stack);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    // Generate OTP
    agent.otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    agent.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.flexiAgentRepo.save(agent);

    // Send Email
    await this.sendPasswordResetEmail(agent);

    return { success: true, message: 'Password reset OTP sent to email' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({
      where: { email: dto.email },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    if (!agent.otp_code || agent.otp_code !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > agent.otp_expires_at) {
      throw new BadRequestException('OTP has expired');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    agent.password = hashedPassword;
    agent.otp_code = null;
    agent.otp_expires_at = null; // Clear OTP

    await this.flexiAgentRepo.save(agent);

    return { success: true, message: 'Password reset successfully' };
  }

  private async sendPasswordResetEmail(agent: FlexiAgent) {
    try {
      const message1 = `You have requested to reset your password for your GDL Flexi Agent account. Use the OTP below to complete the process.`;
      const message2 = `If you did not initiate this request, please ignore this email.`;

      const data = {
        heading_logo: ``,
        heading: `Reset Your Password`,
        message1,
        message2,
        message3: ``,
        request_otp: agent.otp_code,
        url: `${FRONT_END_BASE_URL}`,
        type: 'RESET_PASSWORD',
      };

      const html = auth_actions_html(data);

      const notification_data = {
        sender: 'GDL',
        title: 'Password Reset - GDL Flexi',
        description: 'Password Reset OTP',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: 0,
        recipients_email: agent.email,
        recipients_phone_number: agent.phone,
        request_ref: `FLEXI_RESET_${agent.id}_${Date.now()}`,
        message: `${message1} ${message2}`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'password_reset',
      };

      await this.userService.sendUserAuthNotifications(notification_data);
    } catch (error) {
      this.logger.error(
        `Failed to send reset password email to ${agent.email}`,
        error.stack,
      );
    }
  }

  async changePassword(agentId: number, dto: any): Promise<any> {
    const agent = await this.flexiAgentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    // Verify Old Password
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(dto.oldPassword, agent.password);
    if (!isMatch) throw new BadRequestException('Incorrect old password');

    // Hash New Password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    agent.password = hashedPassword;

    await this.flexiAgentRepo.save(agent);
    return { success: true, message: 'Password changed successfully' };
  }

  async getLoginHistory(agentId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.loginHistoryRepo.findAndCount({
      where: { agent: { id: agentId } },
      order: { login_time: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit),
      },
    };
  }

  // --- Dashboard Methods ---

  async getDashboardStats(agentId: number): Promise<any> {
    this.logger.log(`Fetching dashboard stats for agent ${agentId}`);

    const requests = await this.flexiRequestRepo.find({
      where: { agent: { id: agentId } },
    });

    const total = requests.length;
    const approved = requests.filter(
      (r) => r.status === FlexiRequestStatus.APPROVED,
    ).length;
    const pending = requests.filter(
      (r) =>
        r.status === FlexiRequestStatus.PENDING_APPROVAL ||
        r.status === FlexiRequestStatus.PENDING_DOCS ||
        r.status === FlexiRequestStatus.PENDING_SUBMISSION,
    ).length;
    const rejected = requests.filter(
      (r) => r.status === FlexiRequestStatus.REJECTED,
    ).length;

    // Calculate Total Approved Amount
    const total_approved_amount = requests
      .filter((r) => r.status === FlexiRequestStatus.APPROVED)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      total_requests: total,
      approved_requests: approved,
      pending_requests: pending,
      rejected_requests: rejected,
      total_approved_amount,
    };
  }

  async getAgentTransactions(agentId: number, query?: any): Promise<any> {
    this.logger.log(`Fetching transactions for agent ${agentId}`);

    const { status, page = 1, limit = 20 } = query || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.investmentRequestRepo
      .createQueryBuilder('req')
      .where('req.flexi_agent_id = :agentId', { agentId });

    if (status) {
      queryBuilder.andWhere('req.status = :status', { status });
    }

    queryBuilder.orderBy('req.created_at', 'DESC').skip(skip).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  // --- Marketer Management ---

  async getMarketers(): Promise<GdlMarketer[]> {
    return this.marketerRepo.find({
      relations: ['office_branch'],
      order: { created_at: 'DESC' },
    });
  }

  async createMarketer(data: Partial<GdlMarketer>): Promise<GdlMarketer> {
    const existing = await this.marketerRepo.findOne({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException(
        'A marketer with this email already exists',
      );
    }

    if (data.office_branch_id && !data.office_branch_name) {
      const branch = await this.adminRepo.query(
        'SELECT branch_name FROM office_branch WHERE id = ?',
        [data.office_branch_id],
      );
      if (branch && branch.length > 0) {
        data.office_branch_name = branch[0].branch_name;
      }
    }

    const marketer = this.marketerRepo.create(data);
    return this.marketerRepo.save(marketer);
  }

  async updateMarketer(
    id: number,
    data: Partial<GdlMarketer>,
  ): Promise<GdlMarketer> {
    const marketer = await this.marketerRepo.findOne({ where: { id } });
    if (!marketer)
      throw new NotFoundException(`Marketer with id ${id} not found`);
    if (data.email && data.email !== marketer.email) {
      const exists = await this.marketerRepo.findOne({
        where: { email: data.email },
      });
      if (exists)
        throw new BadRequestException(
          'Email already in use by another marketer',
        );
    }

    if (
      data.office_branch_id &&
      data.office_branch_id !== marketer.office_branch_id
    ) {
      const branch = await this.adminRepo.query(
        'SELECT branch_name FROM office_branch WHERE id = ?',
        [data.office_branch_id],
      );
      if (branch && branch.length > 0) {
        data.office_branch_name = branch[0].branch_name;
      }
    }

    Object.assign(marketer, data);
    return this.marketerRepo.save(marketer);
  }

  async deleteMarketer(id: number): Promise<void> {
    const marketer = await this.marketerRepo.findOne({ where: { id } });
    if (!marketer)
      throw new NotFoundException(`Marketer with id ${id} not found`);
    await this.marketerRepo.remove(marketer);
  }

  // --- Auth Helper Methods ---

  private async signAgentToken(agent: FlexiAgent) {
    const payload = {
      user_id: agent.id, // Using agent.id as user_id for token
      username: agent.email, // Required for fingerprint validation
      user_ref: `FLEXI-${agent.id}`,
      account: null,
      user_type: 'FLEXI_AGENT',
      user_name: `${agent.first_name || 'Flexi'} ${agent.last_name || 'Agent'}`,
      phone: agent.phone,
      roles: UserType.USER,
      client_ip: '0.0.0.0', // TODO: Capture real IP
      fingerprint: this.jwtAuthUtilsService.generateFingerprint(
        agent.email,
        '0.0.0.0',
      ),
      jti: crypto.randomUUID(),
    };

    const encryptedPayload = this.jwtAuthUtilsService.encryptPayload(payload);

    // Access Token fix: Shortened to 15m for better security
    const accessToken = await this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      process.env.ACCESS_AUTH || 'access-secret',
      '15m',
    );

    // Refresh Token (Long lived - 7d)
    const refreshToken = await this.jwtAuthUtilsService.jwTSign(
      encryptedPayload,
      process.env.REFRESH_AUTH || 'refresh-secret',
      '7d',
    );

    // Hash and store refresh token in DB
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    await this.flexiAgentRepo.update(agent.id, {
      refresh_token: hashedRefreshToken,
      refresh_token_expires_at: expiryDate,
    });

    return {
      success: true,
      accessToken,
      refreshToken,
      user: agent,
    };
  }

  async refreshAgentToken(refreshToken: string): Promise<any> {
    try {
      // 1. Validate Token Structure and Expiry
      const secret = process.env.REFRESH_AUTH || 'refresh-secret';
      const payload = await this.jwtAuthUtilsService.validateRefreshToken(
        refreshToken,
        secret,
      );

      if (!payload || payload.user_type !== 'FLEXI_AGENT') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 2. Find Agent and check stored token
      const agent = await this.flexiAgentRepo.findOne({
        where: { id: payload.user_id },
      });

      if (!agent || !agent.refresh_token || !agent.refresh_token_expires_at) {
        throw new UnauthorizedException('Refresh token not found or expired');
      }

      if (new Date() > agent.refresh_token_expires_at) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // 3. Compare with stored hash
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(refreshToken, agent.refresh_token);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 4. Issue new tokens
      return this.signAgentToken(agent);
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async generateUploadUrl(
    fileName: string,
    contentType: string,
    folder = 'temp',
  ) {
    const key = `flexi_uploads/${folder}/${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });

    return { uploadUrl: url, key, expiresIn: SIGNED_URL_EXPIRATION };
  }

  private async sendApprovalNotification(
    request: FlexiRequest,
    type:
      | 'NEXT_APPROVER'
      | 'FINAL_APPROVAL'
      | 'REJECTED'
      | 'FUNDS_DISBURSED'
      | 'MARKETER',
    nextApprover?: Admin,
    marketer?: GdlMarketer,
  ) {
    let heading = '';
    let userName = '';
    let introText = '';
    let recipientEmail = '';
    let recipientUserId = 0;

    const requestDetails = [
      { label: 'Request Type', value: request.request_type },
      { label: 'Amount', value: `₦${Number(request.amount).toLocaleString()}` },
      { label: 'Reference', value: `FLEXI-${request.id}` },
      { label: 'Stage', value: request.current_workflow_stage || 'N/A' },
    ];

    if (type === 'NEXT_APPROVER' && nextApprover) {
      heading = 'Flexi Request Pending Your Approval';
      userName = `${nextApprover.staffFirstName} ${nextApprover.staffLastName}`;
      introText = `A Flexi Request from <b>${request.user?.first_name} ${request.user?.last_name}</b> has been approved at the previous level and now requires your review.`;
      recipientEmail = nextApprover.staffEmail;
      recipientUserId = nextApprover.staffId;
    } else if (type === 'MARKETER' && marketer) {
      heading = 'New Flexi Request Created';
      userName = `${marketer.first_name} ${marketer.last_name}`;
      introText = `A new Flexi Request has been created for your client <b>${request.user?.first_name} ${request.user?.last_name}</b> and is currently pending approval.`;
      recipientEmail = marketer.email;
      recipientUserId = 0; // External or not linked to Staff ID yet
    } else if (type === 'FINAL_APPROVAL') {
      heading = 'Flexi Request Fully Approved';
      userName = `${request.user?.first_name} ${request.user?.last_name}`;
      introText = `Your Flexi Request has been fully approved. The requested funds will be processed shortly.`;
      recipientEmail = request.user?.email;
      recipientUserId = request.user?.id;
    } else if (type === 'REJECTED') {
      heading = 'Flexi Request Declined';
      userName = `${request.user?.first_name} ${request.user?.last_name}`;
      introText = `Your Flexi Request has been declined.`;
      requestDetails.push({
        label: 'Reason',
        value: request.rejection_reason || 'No reason provided',
      });
      recipientEmail = request.user?.email;
      recipientUserId = request.user?.id;
    } else if (type === 'FUNDS_DISBURSED') {
      heading = 'Flexi Funds Disbursed';
      userName = `${request.user?.first_name} ${request.user?.last_name}`;
      const expiryDate = request.expiry_date
        ? new Date(request.expiry_date).toLocaleDateString()
        : 'N/A';
      introText = `Your Flexi funds have been successfully disbursed to your account. <br><br><b>Important:</b> This facility is set to expire on <b>${expiryDate}</b>.`;
      requestDetails.push({ label: 'Tenure', value: request.tenure || 'N/A' });
      requestDetails.push({ label: 'Expiry Date', value: expiryDate });
      recipientEmail = request.user?.email;
      recipientUserId = request.user?.id;
    }

    if (!recipientEmail) return;

    const html = investment_request_html({
      heading,
      userName,
      introText,
      details: requestDetails,
      closingText:
        type === 'NEXT_APPROVER'
          ? 'Please log in to the admin dashboard to take action.'
          : 'Thank you for choosing GDL.',
      supportText:
        'For any questions, contact our support team at support@housemoni.ng',
    });

    const notificationData = {
      sender: 'GDL Flexi',
      title: heading,
      description: introText.replace(/<[^>]*>?/gm, ''),
      notification_type: 'IMPORTANT_ACTION',
      notification_mode: 'SINGLE',
      notification_channel: 'EMAIL',
      recipients_user_id: recipientUserId,
      recipients_email: recipientEmail,
      recipients_phone_number: 'null',
      request_ref: `FLEXI_${request.id}_${Date.now()}`,
      message: introText.replace(/<[^>]*>?/gm, ''),
      complete_html_body: html,
      purpose: 'flexi_approval',
      type: AuthRequestType.SUBSCRIPTION_CONFIRMATION, // Using existing type for general notifications
    };

    await this.userService.sendUserAuthNotifications(notificationData);
    this.logger.log(
      `Flexi approval notification (${type}) sent to ${recipientEmail}`,
    );
  }

  private async evaluateAndSkipLevels(
    requestId: number,
    initiatorAdminId?: number,
  ): Promise<FlexiRequest> {
    let request = await this.flexiRequestRepo.findOne({
      where: { id: requestId },
      relations: [
        'workflow',
        'workflow.steps',
        'workflow.steps.admin',
        'workflow.steps.admin.office_branch',
        'marketer',
        'marketer.office_branch',
        'agent',
      ],
    });

    if (
      !request ||
      !request.workflow ||
      !request.workflow.steps ||
      request.workflow.steps.length === 0
    )
      return request;

    const marketerBranchId = request.marketer?.office_branch?.id;

    const steps = [...request.workflow.steps].sort((a, b) => a.level - b.level);
    const maxLevel = Math.max(...steps.map((s) => s.level));

    let currentLevel = request.current_approval_level;
    let currentStep = steps.find((s) => s.level === currentLevel);

    let wasSkipped = false;

    while (currentStep && currentLevel <= maxLevel) {
      if (currentStep.enforce_branch_restriction) {
        const adminBranchId = currentStep.admin?.office_branch?.id;
        // Only strictly enforce matching branch IDs - if they don't match, we skip
        if (
          adminBranchId &&
          marketerBranchId &&
          String(adminBranchId) !== String(marketerBranchId)
        ) {
          // SKIP THIS STEP
          const adminData = initiatorAdminId
            ? { staffId: initiatorAdminId }
            : currentStep.admin
            ? { staffId: currentStep.admin.staffId }
            : null;
          const skipHistory = this.approvalHistoryRepo.create({
            request: request,
            admin: adminData as any,
            level: currentLevel,
            status: FlexiRequestStatus.SKIPPED,
            comment: 'Automatically skipped due to branch mismatch',
          });
          await this.approvalHistoryRepo.save(skipHistory);

          currentLevel += 1;
          currentStep = steps.find((s) => s.level === currentLevel);
          wasSkipped = true;
          continue;
        }
      }
      // Valid step, do not skip
      break;
    }

    if (wasSkipped) {
      if (currentLevel > maxLevel) {
        request.current_approval_level = maxLevel;
        request.status = FlexiRequestStatus.FUNDS_DISBURSED;
        request.current_workflow_stage = 'Funds Disbursed';
        request.disbursed_at = new Date();
        if (request.tenure) {
          const days = parseInt(request.tenure, 10);
          if (!isNaN(days)) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            request.expiry_date = expiryDate;
          }
        }
      } else {
        request.current_approval_level = currentLevel;
        request.current_workflow_stage = `Approval Level ${currentLevel}`;
        request.status = FlexiRequestStatus.PENDING_APPROVAL;
      }
      request = await this.flexiRequestRepo.save(request);
    }
    return request;
  }
}
