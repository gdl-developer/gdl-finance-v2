import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditLogger } from "./entities/audit-logger.entity";
import { Repository } from "typeorm";
import { AbstractService } from "../abstracts/abstract.service";
import { decrypt } from "../utils/crypto-hash-helper";
import { paginatedResult } from "../paginated-result.interface";

@Injectable()
export class AuditLoggerService extends AbstractService {
  constructor(
    @InjectRepository(AuditLogger)
    private readonly auditLoggerRepo: Repository<AuditLogger>
  ) {
    super(auditLoggerRepo);
  }

  async getAuditLogs(
    LOG_EKY: string,
    page?: number,
    per_page?: number,
    query?: any
  ): Promise<paginatedResult> {
    const audit_logs = await this.paginate(page, per_page, {
      ...query,
    });

    audit_logs.data.forEach(async (log) => {
      const decrypted = JSON.parse(await decrypt(log.attributes, LOG_EKY));
      log.attributes = decrypted;
    });

    return audit_logs;
  }

  async insert(data: any): Promise<AuditLogger> {
    const log = await this.create(data);

    if (!log) {
      throw new NotImplementedException("Audit Log Creation Failed");
    }

    return log;
  }
}
