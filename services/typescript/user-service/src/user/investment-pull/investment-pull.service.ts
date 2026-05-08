import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserInvestmentPool,
  InvestmentPoolType,
  InvestmentPoolStatus,
} from './entities/investment-pull.entity';
import { Admin } from 'src/admin/admin/entities/admin.entity';
import { InvestmentPoolCreateService } from './pool-create.service';
import { InvestmentPoolUpdateService } from './pool-update.service';
import { InvestmentPoolDeductionService } from './pool-deduction.service';
import { DailyAccrualLog } from './entities/investment-pool-accrued-log.entity';
import {
  CreateInvestmentPool2Dto,
  CreateInvestmentPoolDto,
  InfowarePortfolioResponse,
  PortfolioPositionResponse,
} from './dto/investment-pull.dto';
import { InfowareService } from '../infoware-request/infoware-request.service';
import { UserService } from '../user/user.service';
import { VirtualWalletService } from '../virtual-account/virtual-wallet.service';
import { InvestmentRequestService } from '../investment-request/investment-request.service';

@Injectable()
export class InvestmentPoolService {
  private readonly logger = new Logger('OSWAPS::InvestmentPoolService');

  constructor(
    private readonly createService: InvestmentPoolCreateService,
    private readonly updateService: InvestmentPoolUpdateService,
    private readonly investmentRequestService: InvestmentRequestService,
    private readonly deductionService: InvestmentPoolDeductionService,
    @InjectRepository(UserInvestmentPool)
    private readonly poolRepo: Repository<UserInvestmentPool>,
    @InjectRepository(DailyAccrualLog)
    private readonly accrualRepo: Repository<DailyAccrualLog>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly infowareService: InfowareService,
    private readonly virtualWalletService: VirtualWalletService,
  ) {}

  /**
   * 🚀 Create a new investment pool for a user
   */
  async createInvestmentPool(user_id: number, dto: CreateInvestmentPool2Dto) {
    return this.createService.create(user_id, dto);
  }

  /**
   * Update a user’s investment pool
   */
  async updateUserInvestmentPool(
    userId: number,
    poolType: string,
    amount: number,
    options?: { meta?: Record<string, any> },
  ) {
    return this.updateService.update(userId, poolType, amount, options);
  }

  /**
   * deduct amount from a user’s pool
   */
  async deductFromUserPool(
    userId: number,
    poolType: InvestmentPoolType,
    amount: number,
    options?: { reference?: string; meta?: any },
  ) {
    return this.deductionService.deduct(userId, poolType, amount, options);
  }

  /**
   * 📦 Fetch all investment pools for a specific user
   */
  async getUserPools(
    userId: number,
  ): Promise<{ status: number; total: number; pool: any[] }> {
    try {
      const userWallet =
        await this.virtualWalletService.getUserVirtualWalletsInternal(userId);
      if (!userWallet) {
        throw new NotFoundException(`No virtual wallet found`);
      }
      const customerId = userWallet.encrypted_infoware_customer_id;

      // Fetch portfolio positions from Infoware
      const portfolioResponse =
        (await this.infowareService.getPortfolioPosition(
          customerId,
        )) as PortfolioPositionResponse;
      const rows = portfolioResponse.DataTable?.Rows ?? [];

      // Map rows to structured investment pool objects
      const pools = rows.map((row: any) => ({
        type:
          row['1'] === 'AIF'
            ? InvestmentPoolType.INCOME
            : InvestmentPoolType.CANARY, // TODO: adjust production logic if needed
        status: 'ACTIVE',
        date: row['0'] ? new Date(row['0']) : null,
        fundCode: row['1'] ?? '',
        fundName: row['2'] ?? '',
        units: Number(row['4'] ?? 0),
        principal: Number(row['5'] ?? 0),
        marketPrice: Number(row['7'] ?? 0),
        marketValue: Number(row['8'] ?? 0),
        accruedInterestOrGain: Number(row['9'] ?? 0),
        gainOrLossPercent: Number(row['10'] ?? 0),
      }));

      // Fetch MMF pool investments from Symplus via InvestmentRequestService
      try {
        const mmfResult =
          await this.investmentRequestService.getUserTotalActiveInvestmentAmount(
            userId,
          );
        if (
          mmfResult &&
          mmfResult.status === 'ACTIVE' &&
          mmfResult.investment
        ) {
          const inv = mmfResult.investment;
          pools.push({
            type: InvestmentPoolType.MMF,
            status: mmfResult.status,
            date: inv.date ? new Date(inv.date) : null,
            fundCode: inv.fund_code ?? '',
            fundName: inv.fund_name ?? '',
            units: Number(inv.units ?? 0),
            principal: Number(inv.principal ?? 0),
            marketPrice: Number(inv.market_price ?? 0),
            marketValue: Number(inv.market_value ?? 0),
            accruedInterestOrGain: Number(inv.accrued_interest ?? 0),
            gainOrLossPercent: Number(inv.accrued_interest_percent ?? 0),
          });
        }
      } catch (mmfError) {
        this.logger.error(
          `Failed to fetch MMF investments for user ${userId}: ${mmfError.message}`,
        );
        // Don't fail the whole request if only MMF fails
      }

      return {
        status: portfolioResponse.StatusID,
        total: pools.length,
        pool: pools,
      };
    } catch (error: any) {
      if (this.logger) {
        this.logger.error(
          `[OSWAPS::InvestmentPoolService] Failed to fetch investment pools for user ${userId}: ${
            error?.message || error
          } `,
          error?.stack,
        );
      } else {
        console.error(
          `[OSWAPS::InvestmentPoolService] Logger not initialized. Error:`,
          error,
        );
      }
      throw new InternalServerErrorException(
        'Unable to fetch investment pools at this time',
      );
    }
  }

  /**
   * 🔍 Fetch a user’s single pool by type
   */

  async getUserInvestmentPoolByType(
    userId: number,
    type: InvestmentPoolType,
    custid?: string,
  ): Promise<any> {
    this.logger.log(
      `[FETCH_POOL_BY_TYPE] Fetching investment pool for user: ${userId} `,
    );

    const temp = custid;

    interface InfowarePortfolioResponse {
      DataTable?: {
        ColumnDef: Record<string, string>;
        Rows: Record<string, any>[];
      };
      StatusID: number;
      StatusMessage: string;
      OutValue: string;
    }

    const poolResponse = (await this.infowareService.getPortfolioPosition(
      temp,
    )) as InfowarePortfolioResponse;

    console.log('Raw Pool Response:', JSON.stringify(poolResponse, null, 2));
    console.log('Requested type:', type);

    if (!poolResponse || poolResponse.StatusID !== 0) {
      throw new NotFoundException(
        `Invalid investment pool response for user ${userId}`,
      );
    }

    const rows = poolResponse.DataTable?.Rows ?? [];

    if (!rows.length) {
      return {
        user_id: userId,
        custid: temp,
        total_pools: 0,
        investments: [],
        total: null,
      };
    }

    // Helper to safely convert values to numbers
    const toNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    // Fund code map → pool type
    const resolvePoolType = (fund: string): InvestmentPoolType | undefined => {
      switch (fund) {
        case 'CGF':
          return InvestmentPoolType.CANARY;
        case 'AIF':
          return InvestmentPoolType.INCOME;
        default:
          return undefined;
      }
    };

    // Map rows to structured objects
    const mapped = rows.map((row) => {
      const fundCode = row['1'];
      return {
        date: row['0'],
        fund_code: fundCode,
        fund_name: row['2'],
        customer_id: row['3'],
        units: toNum(row['4']),
        principal: toNum(row['5']),
        market_price: toNum(row['7']),
        market_value: toNum(row['8']),
        accrued_interest: toNum(row['9']),
        accrued_interest_percent: toNum(row['10']),
        type: resolvePoolType(fundCode),
      };
    });

    // Filter by requested pool type
    const filtered = mapped.filter((inv) => inv.type === type);

    if (!filtered.length) {
      return {
        user_id: userId,
        custid: temp,
        total_pools: 0,
        investments: [],
        total: null,
      };
    }

    // Prepare clean API objects
    const investments = filtered.map((inv) => ({
      date: inv.date,
      type: inv.type,
      fund_code: inv.fund_code,
      fund_name: inv.fund_name,
      customer_id: inv.customer_id,
      units: inv.units,
      principal: inv.principal,
      market_price: inv.market_price,
      market_value: inv.market_value,
      accrued_interest: inv.accrued_interest,
      accrued_interest_percent: inv.accrued_interest_percent,
    }));

    // Using the first investment as the "main"
    const main = investments[0];
    console.log('done checking', {
      user_id: userId,
      custid: temp,
      total_pools: investments.length,
      investments,
      total: {
        user_id: userId,
        type,
        status: 'ACTIVE',
        investment: main,
      },
    });
    return {
      user_id: userId,
      custid: temp,
      total_pools: investments.length,
      investments,
      total: {
        user_id: userId,
        type,
        status: 'ACTIVE',
        investment: main,
      },
    };
  }

  /**
   * 🔍 Fetch a user’s single pool by type
   */
  async redeemInvestment(
    custAID: string,
    fundCode: string,
    amount: number,
  ): Promise<any> {
    const effectiveDate = new Date().toDateString();
    console.log('payload', custAID, fundCode, effectiveDate, amount);
    const pool = await this.infowareService.redeem(
      custAID,
      fundCode,
      effectiveDate,
      amount,
    );
    console.log('pool', pool);
    return pool;
  }

  /**
   * 🔹 Fetch all investment pools with optional type, status, search, pagination, and sorting
   */
  async getAllPools(
    type?: InvestmentPoolType,
    status?: InvestmentPoolStatus,
    search?: string,
    page = 1,
    limit?: number,
    sort: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{
    success: string;
    response_code: string;
    response_description: string;
    data?: UserInvestmentPool[];
    total?: number;
    totalPages?: number;
    currentPage?: number;
  }> {
    const query = this.poolRepo
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.user', 'user')
      .select(['pool', 'user.id', 'user.first_name', 'user.last_name']);

    if (type) {
      query.andWhere('LOWER(pool.type) = :type', { type: type.toLowerCase() });
    }

    if (status) {
      query.andWhere('LOWER(pool.status) = :status', {
        status: status.toLowerCase(),
      });
    }

    if (search) {
      query.andWhere(
        `(user.first_name LIKE :search 
        OR user.last_name LIKE :search 
        OR pool.description LIKE :search 
        OR pool.type LIKE :search 
        OR CAST(pool.total_invested AS CHAR) LIKE :search 
        OR CAST(pool.total_redeemed AS CHAR) LIKE :search 
        OR CAST(pool.current_balance AS CHAR) LIKE :search 
        OR CAST(pool.nav AS CHAR) LIKE :search 
        OR CAST(pool.yield_rate AS CHAR) LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const sortOrder =
      sort && ['ASC', 'DESC'].includes(sort.toUpperCase())
        ? (sort.toUpperCase() as 'ASC' | 'DESC')
        : 'DESC';

    // Apply sorting
    query.orderBy('pool.created_at', sortOrder);

    // Get total before pagination
    const total = await query.getCount();

    // Apply pagination only if limit is provided
    if (limit && limit > 0) {
      const skip = (page - 1) * limit;
      query.skip(skip).take(limit);
    }

    const data = await query.getMany();

    const totalPages = limit && limit > 0 ? Math.ceil(total / limit) : 1;

    if (!data.length) {
      return {
        success: 'false',
        response_code: '004',
        data: [],
        response_description: 'No investment pools found',
      };
    }

    return {
      success: 'true',
      response_code: '001',
      response_description: 'Investment pools retrieved successfully',
      data,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async addDailyAccrual(
    poolId: number,
    adminId: number,
    type: InvestmentPoolType,
    gain = '0.00',
    loss = '0.00',
  ): Promise<DailyAccrualLog> {
    // Fetch pool
    const pool = await this.poolRepo.findOne({ where: { id: poolId } });
    if (!pool)
      throw new NotFoundException(
        `Investment pool with ID ${poolId} not found`,
      );

    // Fetch admin with business unit
    const admin = await this.adminRepo.findOne({
      where: { staffId: adminId },
      relations: ['business_unit'], // fetch department info
    });
    if (!admin)
      throw new NotFoundException(`Admin with ID ${adminId} not found`);

    const gainNum = Number(gain);
    const lossNum = Number(loss);

    if (gainNum < 0 || lossNum < 0) {
      throw new BadRequestException('Accrued gain and loss cannot be negative');
    }

    // Update pool balances
    const currentBalance = Number(pool.current_balance) + gainNum - lossNum;
    pool.current_balance = currentBalance.toFixed(2);
    pool.accrued_gain = (Number(pool.accrued_gain || 0) + gainNum).toFixed(2);
    pool.accrued_loss = (Number(pool.accrued_loss || 0) + lossNum).toFixed(2);

    await this.poolRepo.save(pool);

    // Create daily accrual log
    const accrual = this.accrualRepo.create({
      pool,
      pool_id: pool.id,
      investment_type: type,
      accrued_gain: gainNum.toFixed(2),
      accrued_loss: lossNum.toFixed(2),
      balance_with_gain_or_loss: currentBalance.toFixed(2),
      admin_id: admin.staffId,
      admin_first_name: admin.staffFirstName,
      admin_last_name: admin.staffLastName,
      admin_department: admin.business_unit?.business_unit_name || null,
    });

    await this.accrualRepo.save(accrual);

    this.logger.log(
      `Daily accrual added for pool ${pool.id} by admin ${admin.staffId}: +${gainNum} / -${lossNum}`,
    );

    return accrual;
  }

  /**
   * Fetch all daily accrual logs for a specific investment pool and type with optional filters, pagination, and search
   */
  async getAccrualsForPoolAndType(
    poolId: number, // Required pool ID
    investmentType: InvestmentPoolType, // Required investment type
    page = 1,
    limit = 10,
    adminId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Promise<{ data: DailyAccrualLog[]; total: number }> {
    const query = this.accrualRepo
      .createQueryBuilder('accrual')
      .leftJoinAndSelect('accrual.pool', 'pool')
      .leftJoinAndSelect('accrual.admin', 'admin')
      .select([
        'accrual',
        'pool.id',
        'pool.user_id',
        'pool.type',
        'admin.staffId',
        'admin.staffFirstName',
        'admin.staffLastName',
        'admin.business_unit',
      ]);

    // Required filters
    query.andWhere('accrual.pool_id = :poolId', { poolId });
    query.andWhere('accrual.investment_type = :investmentType', {
      investmentType,
    });

    // Optional filters
    if (adminId) query.andWhere('accrual.admin_id = :adminId', { adminId });
    if (startDate)
      query.andWhere('accrual.accrual_date >= :startDate', { startDate });
    if (endDate)
      query.andWhere('accrual.accrual_date <= :endDate', { endDate });

    // Search across admin name and pool user ID
    if (search) {
      query.andWhere(
        `(admin.staffFirstName LIKE :search OR admin.staffLastName LIKE :search OR CAST(pool.user_id AS CHAR) LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    // Pagination
    const [data, total] = await query
      .orderBy('accrual.accrual_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (!data.length) {
      this.logger.warn(
        `[ACCRUALS_NOT_FOUND] No daily accrual logs found for pool ${poolId} and type ${investmentType}`,
      );
      throw new NotFoundException(
        `No daily accrual logs found for pool ${poolId} and type ${investmentType}`,
      );
    }

    return { data, total };
  }

  /**
   * Fetch all daily accrual logs with optional filters, pagination, and search.
   */
  async getAllAccruals(
    page = 1,
    limit = 10,
    poolId?: number,
    investmentType?: InvestmentPoolType,
    adminId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Promise<{ data: DailyAccrualLog[]; total: number }> {
    const query = this.accrualRepo
      .createQueryBuilder('accrual')
      .leftJoinAndSelect('accrual.pool', 'pool')
      .leftJoinAndSelect('accrual.admin', 'admin')
      .select([
        'accrual',
        'pool.id',
        'pool.user_id',
        'pool.type',
        'admin.staffId',
        'admin.staffFirstName',
        'admin.staffLastName',
        'admin.business_unit',
      ]);

    // Apply filters
    if (poolId) query.andWhere('accrual.pool_id = :poolId', { poolId });
    if (investmentType)
      query.andWhere('accrual.investment_type = :investmentType', {
        investmentType,
      });
    if (adminId) query.andWhere('accrual.admin_id = :adminId', { adminId });
    if (startDate)
      query.andWhere('accrual.accrual_date >= :startDate', { startDate });
    if (endDate)
      query.andWhere('accrual.accrual_date <= :endDate', { endDate });

    // Search filter
    if (search) {
      query.andWhere(
        `(admin.staffFirstName LIKE :search OR admin.staffLastName LIKE :search OR admin.business_unit LIKE :search OR CAST(pool.user_id AS CHAR) LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    // Pagination + Sorting
    const [data, total] = await query
      .orderBy('accrual.accrual_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (!data.length) {
      this.logger.warn('[ACCRUALS_NOT_FOUND] No daily accrual logs found.');
      throw new NotFoundException('No daily accrual logs found.');
    }

    return { data, total };
  }

  /**
   * 🔎 Fetch a specific investment type (pool) by its ID
   */
  async getInvestmentTypeById(id: number): Promise<UserInvestmentPool> {
    this.logger.log(
      `[FETCH_POOL_BY_ID] Fetching investment pool with ID: ${id}`,
    );

    const pool = await this.poolRepo.findOne({
      where: { id },
      relations: ['user'], // include related user details for context
    });

    if (!pool) {
      this.logger.warn(
        `[POOL_NOT_FOUND] Investment pool with ID ${id} not found`,
      );
      throw new NotFoundException(`Investment pool with ID ${id} not found`);
    }

    return pool;
  }
}
