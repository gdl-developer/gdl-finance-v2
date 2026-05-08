import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Connection, EntityManager } from 'typeorm';
import Big from 'big.js';
import { AuditService } from './audit.service';
import { generateOswapsReference } from 'src/common/utils/reference.util';
import {
  InvestmentPoolType,
  UserInvestmentPool,
} from './entities/investment-pull.entity';
import { TransactionAuditType } from './entities/transaction-audit.entity';

@Injectable()
export class InvestmentPoolDeductionService {
  private readonly logger = new Logger('OSWAPS::PoolDeductionService');

  constructor(
    private readonly dataSource: Connection,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Deduct inside its own transaction with row lock and audit record.
   */
  async deduct(
    userId: number,
    poolType: InvestmentPoolType,
    amount: number,
    options?: { reference?: string; meta?: any },
  ): Promise<UserInvestmentPool> {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Invalid amount');

    const reference = options?.reference?.trim() || generateOswapsReference();

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Lock the pool row
      const pool = await manager.findOne(UserInvestmentPool, {
        where: { user: { id: userId }, type: poolType },
        lock: { mode: 'pessimistic_write' },
      });

      if (!pool) {
        this.logger.warn(
          `[DEDUCT_FAIL_NO_POOL] user=${userId} type=${poolType}`,
        );
        throw new NotFoundException('Pool not found');
      }

      const balanceBefore = new Big(pool.current_balance ?? 0);
      const deduction = new Big(amount);

      if (deduction.gt(balanceBefore)) {
        this.logger.warn(
          `[DEDUCT_FAIL_INSUFFICIENT] user=${userId} available=${balanceBefore.toFixed(
            2,
          )} req=${deduction.toFixed(2)}`,
        );
        throw new BadRequestException('Insufficient pool balance');
      }

      // update totals
      pool.total_redeemed = new Big(pool.total_redeemed ?? 0)
        .plus(deduction)
        .toFixed(2);
      pool.current_balance = balanceBefore.minus(deduction).toFixed(2);
      pool.updated_at = new Date();

      const savedPool = await manager.save(pool);

      // record audit
      await this.auditService.recordSuccess({
        user_id: userId,
        reference,
        type: TransactionAuditType.DEDUCTION,
        amount: deduction.toFixed(2),
        balance_before: balanceBefore.toFixed(2),
        balance_after: savedPool.current_balance,
        related_entity: options?.meta?.related_entity,
        meta: options?.meta,
      });

      this.logger.log(
        `[DEDUCT_SUCCESS] user=${userId} type=${poolType} amount=${deduction.toFixed(
          2,
        )} ref=${reference}`,
      );
      return savedPool;
    });
  }
}
