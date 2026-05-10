import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogger } from './entities/audit-logger.entity';
import { Between, Like, Repository } from 'typeorm';
import { AbstractService } from '../abstract.service';
import { paginatedResult } from '../paginated-result.interface';
import { decrypt } from '../utils/crypto-hash-helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditLoggerService extends AbstractService {
  private readonly LOG_EKY: string;

  constructor(
    @InjectRepository(AuditLogger)
    private readonly auditLoggerRepo: Repository<AuditLogger>,
    private readonly configService: ConfigService,
  ) {
    super(auditLoggerRepo);
    this.LOG_EKY = this.configService.get<string>('LOG_EKY') || '';
  }

  async getAuditLogs(
    page = 1,
    per_page = 20,
    query?: any,
  ): Promise<paginatedResult> {
    const { search, startDate, endDate, ...other_query } = query || {};

    const { start_date, end_date } = await this.getDateRange(
      startDate,
      endDate,
    );
    const dateCondition = Between(start_date, end_date);

    let whereClause: any;

    if (search) {
      whereClause = [
        {
          ...other_query,
          createdAt: dateCondition,
          user_name: Like(`%${search}%`),
        },
        {
          ...other_query,
          createdAt: dateCondition,
          action_performed: Like(`%${search}%`),
        },
        {
          ...other_query,
          createdAt: dateCondition,
          roles: Like(`%${search}%`),
        },
      ];
    } else {
      whereClause = {
        ...other_query,
        createdAt: dateCondition,
      };
    }

    const take = per_page || 20;
    const skip = (page - 1) * take;

    const [data, total] = await this.auditLoggerRepo.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // Decrypt attributes for each log entry
    const processedData = await Promise.all(
      data.map(async (log) => {
        if (log.attributes && this.LOG_EKY) {
          try {
            const decrypted = await decrypt(log.attributes, this.LOG_EKY);
            try {
              log.attributes = JSON.parse(decrypted);
            } catch {
              log.attributes = decrypted;
            }
          } catch (err) {
            log.attributes = '[Decryption Failed]';
          }
        }
        return log;
      }),
    );

    return {
      data: processedData,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async getAuditLogById(id: number): Promise<AuditLogger> {
    const log = await this.auditLoggerRepo.findOne({ where: { id } });

    if (log && log.attributes && this.LOG_EKY) {
      try {
        const decrypted = await decrypt(log.attributes, this.LOG_EKY);
        try {
          log.attributes = JSON.parse(decrypted);
        } catch {
          log.attributes = decrypted;
        }
      } catch (err) {
        log.attributes = '[Decryption Failed]';
      }
    }

    return log;
  }

  async insert(data: any): Promise<AuditLogger> {
    try {
      const log = await this.create(data);

      if (!log) {
        console.log('Audit Log Creation Failed');
      }

      return log;
    } catch (error) {
      console.log('Audit Log Creation Failed', error);
    }
  }
}
