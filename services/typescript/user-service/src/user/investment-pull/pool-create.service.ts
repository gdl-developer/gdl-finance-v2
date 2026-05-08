import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, DeepPartial } from 'typeorm';
import {
  InvestmentPoolStatus,
  UserInvestmentPool,
} from './entities/investment-pull.entity';
import { CreateInvestmentPool2Dto } from './dto/investment-pull.dto';

@Injectable()
export class InvestmentPoolCreateService {
  private readonly logger = new Logger('OSWAPS::PoolCreateService');

  constructor(
    @InjectRepository(UserInvestmentPool)
    private readonly poolRepo: Repository<UserInvestmentPool>,
    private readonly dataSource: Connection,
  ) {}

  /**
   * Generates a 20-digit unique transaction reference
   */
  private generateReferenceId(): string {
    return Math.floor(1e19 + Math.random() * 9e19).toString();
  }

  /**
   * Create a new investment pool safely (transactional + validated)
   */
  /**
   * Create a new investment pool safely (transactional + validated)
   */
  async create(
    userId: number,
    dto: CreateInvestmentPool2Dto,
  ): Promise<UserInvestmentPool> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    const referenceId = this.generateReferenceId();
    let saved: any;
    try {
      console.log('DTO Received for Pool Creation:', dto);

      // ✅ Validate input
      if (!dto?.pool_type) {
        this.logger.error(`[CREATE_POOL_ERROR] Missing pool_type in DTO`);
        throw new BadRequestException(
          'Pool type is required to create investment pool',
        );
      }
      if (!userId) {
        this.logger.error(`[CREATE_POOL_ERROR] Missing userId`);
        throw new BadRequestException(
          'User ID is required to create investment pool',
        );
      }

      // 🔒 Prevent duplicate pool creation
      const existing = await queryRunner.manager.findOne(UserInvestmentPool, {
        where: { user: { id: userId }, type: dto.pool_type },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existing) {
        // 🧮 Normalize numeric fields to string
        const totalInvested = parseFloat(
          dto.total_invested?.toString() || '0',
        ).toFixed(2);
        const yieldRate = parseFloat(dto.yield_rate?.toString() || '0').toFixed(
          4,
        );
        const nav = parseFloat(dto.nav?.toString() || '0').toFixed(4);

        const pool = queryRunner.manager.create(UserInvestmentPool, {
          user: { id: userId }, // relation object
          type: dto.pool_type,
          description: dto.description ?? null,
          total_invested: totalInvested,
          total_redeemed: '0.00',
          current_balance: totalInvested,
          accrued_gain: '0.00',
          accrued_loss: '0.00',
          balance_with_gain_or_loss: totalInvested,
          yield_rate: yieldRate,
          nav: nav,
          status: InvestmentPoolStatus.ACTIVE,
          is_visible: dto.is_visible ?? true,
          last_updated_by: `system-create-${referenceId}`,
        } as unknown as DeepPartial<UserInvestmentPool>); // ✅ TypeScript safe

        saved = await queryRunner.manager.save(UserInvestmentPool, pool);

        // 🧾 Audit log
        this.logger.log(
          `[AUDIT] [CREATE_POOL] ref=${referenceId} user=${userId} type=${dto.pool_type} poolId=${saved.id}`,
        );

        await queryRunner.commitTransaction();
      }
      if (existing) {
        saved = existing;
      }
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();

      const errorMsg = `[CREATE_POOL_ERROR] ref=${referenceId} user=${userId} msg=${err.message}`;
      this.logger.error(errorMsg, err.stack);

      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        'Failed to create investment pool',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
