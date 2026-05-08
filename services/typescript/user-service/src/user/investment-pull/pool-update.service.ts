import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Big from 'big.js';
// import { UpdateInvestmentPoolDto } from './dto/investment-pull.dto';
import { UserInvestmentPool } from './entities/investment-pull.entity';

@Injectable()
export class InvestmentPoolUpdateService {
  private readonly logger = new Logger('OSWAPS::PoolUpdateService');

  constructor(
    @InjectRepository(UserInvestmentPool)
    private readonly poolRepo: Repository<UserInvestmentPool>,
  ) {}

  async update(
    userId: number,
    poolType: string,
    amount: number,
    options?: { meta?: Record<string, any> },
  ): Promise<UserInvestmentPool> {
    const pool = await this.poolRepo.findOne({
      where: { user: { id: userId }, type: poolType },
    });

    if (!pool) throw new NotFoundException('User investment pool not found');

    try {
      const invested = new Big(pool.total_invested ?? 0);
      const balance = new Big(pool.current_balance ?? 0);

      // ✅ Increment both total invested and balance
      pool.total_invested = invested.plus(amount).toFixed(2);
      pool.current_balance = balance.plus(amount).toFixed(2);

      // ✅ Optional fields or metadata
      if (options?.meta) {
        this.logger.debug(
          `[POOL_META] user=${userId} type=${poolType} meta=${JSON.stringify(
            options.meta,
          )}`,
        );
      }

      pool.updated_at = new Date();

      const saved = await this.poolRepo.save(pool);

      this.logger.log(
        `[POOL_UPDATE] user=${userId} type=${poolType} +₦${amount.toFixed(
          2,
        )} | total_invested=${saved.total_invested} | balance=${
          saved.current_balance
        }`,
      );

      return saved;
    } catch (err) {
      this.logger.error(
        `[POOL_UPDATE_ERROR] user=${userId} type=${poolType} err=${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update user investment pool',
      );
    }
  }
}
