import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TransactionAudit,
  TransactionAuditType,
  TransactionAuditStatus,
} from './entities/transaction-audit.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('OSWAPS::AuditService');

  constructor(
    @InjectRepository(TransactionAudit)
    private readonly auditRepo: Repository<TransactionAudit>,
  ) {}

  async recordSuccess(params: {
    user_id: number;
    reference: string;
    type: TransactionAuditType;
    amount: string;
    balance_before: string;
    balance_after: string;
    related_entity?: string;
    meta?: any;
  }): Promise<TransactionAudit> {
    const audit = this.auditRepo.create({
      user_id: params.user_id,
      reference: params.reference,
      type: params.type,
      amount: params.amount,
      balance_before: params.balance_before,
      balance_after: params.balance_after,
      related_entity: params.related_entity,
      status: TransactionAuditStatus.SUCCESS,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    });
    const saved = await this.auditRepo.save(audit);
    this.logger.log(
      `[AUDIT_SUCCESS] user=${params.user_id} ref=${params.reference} type=${params.type} amount=${params.amount}`,
    );
    return saved;
  }

  async recordPending(params: {
    user_id: number;
    reference: string;
    type: TransactionAuditType;
    amount: string;
    balance_before: string;
    related_entity?: string;
    meta?: any;
  }): Promise<TransactionAudit> {
    const audit = this.auditRepo.create({
      user_id: params.user_id,
      reference: params.reference,
      type: params.type,
      amount: params.amount,
      balance_before: params.balance_before,
      balance_after: params.balance_before, // initially same
      related_entity: params.related_entity,
      status: TransactionAuditStatus.PENDING,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    });
    const saved = await this.auditRepo.save(audit);
    this.logger.log(
      `[AUDIT_PENDING] user=${params.user_id} ref=${params.reference} type=${params.type} amount=${params.amount}`,
    );
    return saved;
  }
}
