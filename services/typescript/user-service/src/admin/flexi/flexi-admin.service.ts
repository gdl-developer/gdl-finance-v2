import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlexiRequest } from 'src/flexi/entities/flexi-request.entity';
import { FlexiAgent } from 'src/flexi/entities/flexi-agent.entity';
import { FlexiDocument } from 'src/flexi/entities/flexi-document.entity';
import { FlexiRequestStatus } from 'src/flexi/entities/flexi-request.enums';
import { FlexiService } from 'src/flexi/flexi.service';
import { InitiateExtensionDto } from 'src/flexi/dto/flexi-request.dto';
import { Brackets } from 'typeorm';

@Injectable()
export class FlexiAdminService {
  constructor(
    @InjectRepository(FlexiRequest)
    private readonly flexiRequestRepository: Repository<FlexiRequest>,
    @InjectRepository(FlexiDocument)
    private readonly flexiDocumentRepository: Repository<FlexiDocument>,
    @InjectRepository(FlexiAgent)
    private readonly flexiAgentRepository: Repository<FlexiAgent>,
    private readonly flexiService: FlexiService,
  ) {}

  async getPendingRequestsForAdmin(adminId: number, query: any) {
    const { page = 1, limit = 10, search } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.flexiRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'requester')
      .leftJoinAndSelect('request.workflow', 'appWorkflow')
      .leftJoinAndSelect('appWorkflow.steps', 'workflowSteps')
      .leftJoinAndSelect('workflowSteps.admin', 'stepAdmin')
      .leftJoinAndSelect('request.documents', 'reqDocuments')
      .leftJoinAndSelect('request.marketer', 'marketer')
      .leftJoinAndSelect('marketer.office_branch', 'marketerBranch')
      // Add a specific join for filtering the "For You" logic without limiting the 'steps' result
      .innerJoin(
        'appWorkflow.steps',
        'currentStep',
        'currentStep.level = request.current_approval_level AND currentStep.admin_id = :adminId',
        { adminId },
      )
      .where('request.status = :status', {
        status: FlexiRequestStatus.PENDING_APPROVAL,
      });

    // Branch matching based on workflow step configuration
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('(currentStep.enforce_branch_restriction = false)').orWhere(
          '(currentStep.enforce_branch_restriction = true AND (marketer.office_branch_id IS NULL OR marketer.office_branch_id = (SELECT branch_id FROM admin WHERE staffId = :adminId)))',
          { adminId: Number(adminId) },
        );
      }),
    );

    if (search) {
      queryBuilder.andWhere(
        '(requester.first_name LIKE :search OR requester.last_name LIKE :search OR requester.email LIKE :search OR request.recipient_bank_name LIKE :search OR request.recipient_account_number LIKE :search OR request.recipient_account_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('request.created_at', 'DESC')
      .skip(skip)
      .take(limitNum);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Sign document URLs
    await Promise.all(
      data.map((request) => this.signRequestDocuments(request)),
    );

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
  async getAllPendingRequests(query: any) {
    return this.getRequestsByStatus(FlexiRequestStatus.PENDING_APPROVAL, query);
  }

  async getRequestsByStatus(status: FlexiRequestStatus, query: any) {
    const { page = 1, limit = 10, search } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.flexiRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'requester')
      .leftJoinAndSelect('request.workflow', 'appWorkflow')
      .leftJoinAndSelect('appWorkflow.steps', 'workflowSteps')
      .leftJoinAndSelect('workflowSteps.admin', 'stepAdmin')
      .leftJoinAndSelect('request.documents', 'reqDocuments')
      .where('request.status = :status', { status });

    if (search) {
      queryBuilder.andWhere(
        '(requester.first_name LIKE :search OR requester.last_name LIKE :search OR requester.email LIKE :search OR request.recipient_bank_name LIKE :search OR request.recipient_account_number LIKE :search OR request.recipient_account_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('request.created_at', 'DESC')
      .skip(skip)
      .take(limitNum);

    const [data, total] = await queryBuilder.getManyAndCount();

    await Promise.all(
      data.map((request) => this.signRequestDocuments(request)),
    );

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getRequestById(id: number) {
    const query = this.flexiRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'requester')
      .leftJoinAndSelect('request.workflow', 'appWorkflow')
      .leftJoinAndSelect('appWorkflow.steps', 'workflowSteps')
      .leftJoinAndSelect('workflowSteps.admin', 'stepAdmin')
      .leftJoinAndSelect('stepAdmin.business_unit', 'stepAdminBU')
      .leftJoinAndSelect('stepAdmin.office_branch', 'stepAdminBranch')
      .leftJoinAndSelect('request.documents', 'reqDocuments')
      .leftJoinAndSelect('request.marketer', 'marketer')
      .leftJoinAndSelect('marketer.office_branch', 'marketerBranch')
      .leftJoinAndSelect('request.agent', 'agent')
      .leftJoinAndSelect('request.approval_history', 'approval_history')
      .leftJoinAndSelect('approval_history.admin', 'historyAdmin')
      .leftJoinAndSelect('historyAdmin.business_unit', 'historyAdminBU')
      .where('request.id = :id', { id });

    const request = await query.getOne();

    if (!request) {
      throw new Error('Flexi Request not found');
    }

    // Sort approval history in memory
    if (request.approval_history) {
      request.approval_history.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    // Sign document URLs
    await this.signRequestDocuments(request);

    return { data: request };
  }

  private async signRequestDocuments(request: FlexiRequest) {
    if (request.documents && request.documents.length > 0) {
      await Promise.all(
        request.documents.map(async (doc) => {
          if (doc.document_url) {
            try {
              doc.document_url = await this.flexiService.getSignedDocumentUrl(
                doc.document_url,
              );
            } catch (err) {
              console.error(`Failed to sign URL for document ${doc.id}:`, err);
            }
          }
          return doc;
        }),
      );
    }
  }

  async getDocumentUrl(documentId: number) {
    const document = await this.flexiDocumentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const signedUrl = await this.flexiService.getSignedDocumentUrl(
      document.document_url,
    );
    return { data: signedUrl };
  }

  async approveRequest(id: number, adminId: number) {
    return this.flexiService.updateStatus(id, adminId, { status: 'APPROVED' });
  }

  async rejectRequest(id: number, adminId: number, reason: string) {
    return this.flexiService.updateStatus(id, adminId, {
      status: 'REJECTED',
      rejection_reason: reason,
    });
  }

  //fekjbjkwbjkwebjew
  async getStats() {
    const allStatuses = [
      FlexiRequestStatus.PENDING_DOCS,
      FlexiRequestStatus.PENDING_SUBMISSION,
      FlexiRequestStatus.PENDING_APPROVAL,
      FlexiRequestStatus.APPROVED,
      FlexiRequestStatus.REJECTED,
      FlexiRequestStatus.FUNDS_DISBURSED,
      FlexiRequestStatus.RECALLED,
    ];

    const rows = await this.flexiRequestRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(r.id)', 'count')
      .addSelect('SUM(r.amount)', 'total_amount')
      .groupBy('r.status')
      .getRawMany();

    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const row of rows) {
      byStatus[row.status] = {
        count: Number(row.count),
        amount: Number(row.total_amount) || 0,
      };
    }

    const get = (s: FlexiRequestStatus) =>
      byStatus[s] || { count: 0, amount: 0 };

    const totalRequests = allStatuses.reduce((sum, s) => sum + get(s).count, 0);
    const totalAmount = allStatuses.reduce((sum, s) => sum + get(s).amount, 0);

    // "Active" = currently in-flight (pending any state + approved awaiting disbursement)
    const totalActive =
      get(FlexiRequestStatus.PENDING_DOCS).count +
      get(FlexiRequestStatus.PENDING_SUBMISSION).count +
      get(FlexiRequestStatus.PENDING_APPROVAL).count +
      get(FlexiRequestStatus.APPROVED).count;

    // "Recovered" = fully completed (funds sent back / recalled)
    const totalRecovered =
      get(FlexiRequestStatus.FUNDS_DISBURSED).count +
      get(FlexiRequestStatus.RECALLED).count;

    return {
      total_requests: totalRequests,
      total_amount: totalAmount,
      total_active: totalActive,
      total_recovered: totalRecovered,
      total_approved: get(FlexiRequestStatus.APPROVED).count,
      total_pending_approval: get(FlexiRequestStatus.PENDING_APPROVAL).count,
      total_pending_approval_amount: get(FlexiRequestStatus.PENDING_APPROVAL)
        .amount,
      total_rejected: get(FlexiRequestStatus.REJECTED).count,
      total_rejected_amount: get(FlexiRequestStatus.REJECTED).amount,
      total_funds_disbursed: get(FlexiRequestStatus.FUNDS_DISBURSED).count,
      total_funds_disbursed_amount: get(FlexiRequestStatus.FUNDS_DISBURSED)
        .amount,
      total_recalled: get(FlexiRequestStatus.RECALLED).count,
      by_status: byStatus,
    };
  }

  async getAgents(query: any) {
    const { page = 1, limit = 10, search } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.flexiAgentRepository.createQueryBuilder('agent');

    if (search) {
      queryBuilder.andWhere(
        '(agent.first_name LIKE :search OR agent.last_name LIKE :search OR agent.email LIKE :search OR agent.phone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('agent.created_at', 'DESC').skip(skip).take(limitNum);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Count requests for each agent
    const dataWithCounts = await Promise.all(
      data.map(async (agent) => {
        const requestCount = await this.flexiRequestRepository.count({
          where: { agent: { id: agent.id } },
        });
        return {
          ...agent,
          requestCount,
        };
      }),
    );

    return {
      data: dataWithCounts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAgentById(id: number) {
    const agent = await this.flexiAgentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new Error('Agent not found');
    }

    const requests = await this.flexiRequestRepository.find({
      where: { agent: { id } },
      order: { created_at: 'DESC' },
    });

    return {
      data: agent,
      requests,
    };
  }

  async initiateExtension(id: number, dto: InitiateExtensionDto) {
    return this.flexiService.initiateExtension(id, dto);
  }

  async confirmExtensionPayment(id: number, adminId: number) {
    return this.flexiService.confirmExtensionPayment(id, adminId);
  }
}
