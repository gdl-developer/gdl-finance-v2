import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAccount } from 'src/user/user/entities/user.entity';
import { Between, Repository } from 'typeorm';
import { FlexiAdminService } from 'src/admin/flexi/flexi-admin.service';
import { InvestmentRequestService } from 'src/user/investment-request/investment-request.service';
import { CanaryInvestmentRequestService } from 'src/user/investment-request-canary/investment-request.service';
import { InvestmentRequestIncomeService } from 'src/user/investment-request-income/investment-request.service';
import { MMFInvestmentRequestStatus } from 'src/user/investment-request/entities/investment-request.entity';
import { CanaryInvestmentRequestStatus } from 'src/user/investment-request-canary/entities/investment-request-canary.entity';
import { IncomeInvestmentRequestStatus } from 'src/user/investment-request-income/entities/investment-request-income.entity';
import { FlexiRequest } from 'src/flexi/entities/flexi-request.entity';
import { FlexiRequestStatus } from 'src/flexi/entities/flexi-request.enums';
import { FundRedemptionMMFRequest } from 'src/user/investment-request/entities/redemption-request.entity';
import { FundRedemptionCanaryRequest } from 'src/user/investment-request-canary/entities/redemption-canary-request.entity';
import { FundRedemptionIncomeRequest } from 'src/user/investment-request-income/entities/redemption-income-request.entity';

@Injectable()
export class ReportingService {
  constructor(
    private readonly flexiAdminService: FlexiAdminService,
    private readonly investmentRequestService: InvestmentRequestService,
    private readonly canaryInvestmentRequestService: CanaryInvestmentRequestService,
    private readonly investmentRequestIncomeService: InvestmentRequestIncomeService,
    @InjectRepository(FundRedemptionMMFRequest)
    private readonly mmfRedemptionRepo: Repository<FundRedemptionMMFRequest>,
    @InjectRepository(FundRedemptionCanaryRequest)
    private readonly canaryRedemptionRepo: Repository<FundRedemptionCanaryRequest>,
    @InjectRepository(FundRedemptionIncomeRequest)
    private readonly incomeRedemptionRepo: Repository<FundRedemptionIncomeRequest>,
    @InjectRepository(UserAccount)
    private readonly userRepo: Repository<UserAccount>,
    @InjectRepository(FlexiRequest)
    private readonly flexiRequestRepo: Repository<FlexiRequest>,
  ) {}

  async userReports() {
    const userRepo = this.userRepo;
    const [total_users, monthly_active_users, total_inactive_users] =
      await Promise.all([
        userRepo.count(),
        userRepo.count({ where: { account_status: 'ACTIVE' } }),
        userRepo.count({ where: { account_status: 'INACTIVE' } }),
      ]);

    return {
      total_users,
      monthly_active_users,
      total_inactive_users,
    };
  }

  private calculateTrend(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    return Number(percent.toFixed(1));
  }

  async getPreviousMonth() {
    const d = new Date();
    const timestamp = d.setMonth(d.getMonth() - 1);
    const last_month = new Date(timestamp);

    return last_month;
  }

  async getPreviousWeek() {
    const now = new Date();
    const last_week = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7,
    );

    return last_week;
  }

  async dashboardStats(isSuperAdmin = true) {
    const getStats = async (service: any) => {
      const repo =
        service.investmentRequestRepository || service.repository || service;
      const stats = await repo
        .createQueryBuilder('request')
        .select('request.status', 'status')
        .addSelect(
          'SUM(COALESCE(request.price, request.amount))',
          'total_amount',
        )
        .groupBy('request.status')
        .getRawMany();

      const result = { pending: 0, disbursed: 0, rejected: 0 };
      stats.forEach((s) => {
        const amount = Number(s.total_amount || 0);
        if (s.status === 'PENDING') result.pending = amount;
        else if (s.status === 'APPROVED' || s.status === 'COMPLETED')
          result.disbursed = amount;
        else if (s.status === 'REJECTED') result.rejected = amount;
      });
      return result;
    };

    const getSubscriberCount = async (service: any) => {
      const repo =
        service.investmentRequestRepository || service.repository || service;
      const result = await repo
        .createQueryBuilder('request')
        .select('COUNT(DISTINCT request.user_id)', 'count')
        .getRawOne();
      return Number(result?.count || 0);
    };

    const [
      mmfStats,
      canaryStats,
      incomeStats,
      flexiStats,
      mmfSubscribers,
      canarySubscribers,
      incomeSubscribers,
    ] = await Promise.all([
      getStats(this.investmentRequestService),
      getStats(this.canaryInvestmentRequestService),
      getStats(this.investmentRequestIncomeService),
      this.flexiAdminService.getStats(),
      getSubscriberCount(this.investmentRequestService),
      getSubscriberCount(this.canaryInvestmentRequestService),
      getSubscriberCount(this.investmentRequestIncomeService),
    ]);

    // Fetch recent records for activity log
    const [mmfRecent, canaryRecent, incomeRecent] = await Promise.all([
      this.investmentRequestService.investmentRequestRepository.find({
        order: { created_at: 'DESC' },
        take: 5,
        relations: ['user'],
      }),
      this.canaryInvestmentRequestService.investmentRequestRepository.find({
        order: { created_at: 'DESC' },
        take: 5,
        relations: ['user'],
      }),
      this.investmentRequestIncomeService.investmentRequestRepository.find({
        order: { created_at: 'DESC' },
        take: 5,
        relations: ['user'],
      }),
    ]);

    const getDayBounds = (daysAgo: number) => {
      const start = new Date();
      start.setDate(start.getDate() - daysAgo);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    const today = getDayBounds(0);
    const yesterday = getDayBounds(1);

    const getDailyCount = async (
      repo: any,
      bounds: { start: any; end: any },
    ) => {
      return await repo.count({
        where: { created_at: Between(bounds.start, bounds.end) },
      });
    };

    const getDailyAmount = async (
      service: any,
      bounds: { start: any; end: any },
    ) => {
      const repo =
        service.investmentRequestRepository || service.repository || service;
      const result = await repo
        .createQueryBuilder('request')
        .select('SUM(COALESCE(request.price, request.amount))', 'total_amount')
        .where('request.created_at BETWEEN :start AND :end', {
          start: bounds.start,
          end: bounds.end,
        })
        .getRawOne();
      return Number(result?.total_amount || 0);
    };

    // Calculate trends
    const userRepo = this.userRepo;
    const [usersToday, usersYesterday] = await Promise.all([
      getDailyCount(userRepo, today),
      getDailyCount(userRepo, yesterday),
    ]);

    const flexiRegRepo = this.flexiRequestRepo;
    const [
      flexiToday,
      flexiYesterday,
      mmfToday,
      canaryToday,
      incomeToday,
      mmfYesterday,
      canaryYesterday,
      incomeYesterday,
    ] = await Promise.all([
      getDailyCount(flexiRegRepo, today),
      getDailyCount(flexiRegRepo, yesterday),
      getDailyAmount(this.investmentRequestService, today),
      getDailyAmount(this.canaryInvestmentRequestService, today),
      getDailyAmount(this.investmentRequestIncomeService, today),
      getDailyAmount(this.investmentRequestService, yesterday),
      getDailyAmount(this.canaryInvestmentRequestService, yesterday),
      getDailyAmount(this.investmentRequestIncomeService, yesterday),
    ]);

    // Aggregated Recent Investments
    const transformRequest = (req: any, type: string) => ({
      id: req.id,
      user_object: JSON.stringify({
        first_name: req.first_name || req.user?.first_name,
        last_name: req.last_name || req.user?.last_name,
        user_txn_ref: req.reference || `REF-${req.id}`,
      }),
      amount: req.price || req.amount,
      transaction_type: type,
      narration: `${type} Subscription`,
      txn_ref: req.reference,
      transaction_status: req.status,
      created_at: req.created_at || req.date,
    });

    const recentInvestments = [
      ...mmfRecent.map((r) => transformRequest(r, 'MMF')),
      ...canaryRecent.map((r) => transformRequest(r, 'CANARY')),
      ...incomeRecent.map((r) => transformRequest(r, 'INCOME')),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 10);

    // Fetch recent redemption requests from all fund types
    const transformRedemption = (req: any, type: string) => ({
      id: req.id,
      user_object: JSON.stringify({
        first_name: req.first_name || '',
        last_name: req.last_name || '',
        user_txn_ref: req.reference || `REF-${req.id}`,
      }),
      amount: req.amount,
      transaction_type: `${type} Redemption`,
      narration: `${type} Fund Redemption`,
      txn_ref: req.reference,
      transaction_status: req.status,
      created_at: req.created_at,
    });

    const [mmfRedemptions, canaryRedemptions, incomeRedemptions] =
      await Promise.all([
        this.mmfRedemptionRepo.find({ order: { created_at: 'DESC' }, take: 5 }),
        this.canaryRedemptionRepo.find({
          order: { created_at: 'DESC' },
          take: 5,
        }),
        this.incomeRedemptionRepo.find({
          order: { created_at: 'DESC' },
          take: 5,
        }),
      ]);

    const recentRedemptions = [
      ...mmfRedemptions.map((r) => transformRedemption(r, 'MMF')),
      ...canaryRedemptions.map((r) => transformRedemption(r, 'Canary')),
      ...incomeRedemptions.map((r) => transformRedemption(r, 'Income')),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 10);

    return {
      flexi: {
        pending_amount: isSuperAdmin
          ? flexiStats.total_pending_approval_amount
          : 0,
        disbursed_amount: isSuperAdmin
          ? flexiStats.total_funds_disbursed_amount
          : 0,
        rejected_amount: isSuperAdmin ? flexiStats.total_rejected_amount : 0,
        trend: this.calculateTrend(flexiToday, flexiYesterday),
        pending_count: await flexiRegRepo.count({
          where: { status: FlexiRequestStatus.PENDING_APPROVAL },
        }),
        disbursed_count: await flexiRegRepo.count({
          where: { status: FlexiRequestStatus.APPROVED },
        }),
        rejected_count: await flexiRegRepo.count({
          where: { status: FlexiRequestStatus.REJECTED },
        }),
        disbursed_today: isSuperAdmin
          ? await getDailyAmount(
              {
                repository: this.flexiRequestRepo,
                createQueryBuilder: () =>
                  this.flexiRequestRepo
                    .createQueryBuilder('request')
                    .where('request.disbursed_at BETWEEN :start AND :end', {
                      start: today.start,
                      end: today.end,
                    }),
              },
              today,
            )
          : 0,
        all_pending_amount: isSuperAdmin
          ? (
              await flexiRegRepo
                .createQueryBuilder('r')
                .select('SUM(r.amount)', 'sum')
                .where('r.status IN (:...statuses)', {
                  statuses: [
                    FlexiRequestStatus.PENDING_DOCS,
                    FlexiRequestStatus.PENDING_SUBMISSION,
                    FlexiRequestStatus.PENDING_APPROVAL,
                    FlexiRequestStatus.APPROVED,
                  ],
                })
                .getRawOne()
            ).sum || 0
          : 0,
      },
      asset_management: {
        pending_amount: isSuperAdmin
          ? mmfStats.pending + canaryStats.pending + incomeStats.pending
          : 0,
        disbursed_amount: isSuperAdmin
          ? mmfStats.disbursed + canaryStats.disbursed + incomeStats.disbursed
          : 0,
        rejected_amount: isSuperAdmin
          ? mmfStats.rejected + canaryStats.rejected + incomeStats.rejected
          : 0,
        total_amount: isSuperAdmin
          ? (
              mmfStats.pending +
              canaryStats.pending +
              incomeStats.pending +
              mmfStats.disbursed +
              canaryStats.disbursed +
              incomeStats.disbursed
            ).toFixed(2)
          : 0,
        total_subscribers:
          mmfSubscribers + canarySubscribers + incomeSubscribers,
        mmf_subscribers: mmfSubscribers,
        canary_subscribers: canarySubscribers,
        income_subscribers: incomeSubscribers,
        mmf_value: isSuperAdmin ? mmfStats.disbursed + mmfStats.pending : 0,
        canary_value: isSuperAdmin
          ? canaryStats.disbursed + canaryStats.pending
          : 0,
        income_value: isSuperAdmin
          ? incomeStats.disbursed + incomeStats.pending
          : 0,
        trend: this.calculateTrend(
          mmfToday + canaryToday + incomeToday,
          mmfYesterday + canaryYesterday + incomeYesterday,
        ),
      },
      general: {
        total_users: (await this.userReports()).total_users,
        trend: this.calculateTrend(usersToday, usersYesterday),
      },
      usage_stats: await this.getRegistrationTrends(),
      flexi_trends: await this.getFlexiTrends(),
      recent_investments: recentInvestments.map((req) => ({
        ...req,
        amount: isSuperAdmin ? req.amount : 0,
      })),
      recent_redemptions: recentRedemptions.map((req) => ({
        ...req,
        amount: isSuperAdmin ? req.amount : 0,
      })),
    };
  }

  async getRegistrationTrends() {
    const userRepo = this.userRepo;
    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await userRepo.count({
        where: {
          created_at: Between(date, endOfDay),
        },
      });

      trends.push({
        date: date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        count: count,
      });
    }
    return trends;
  }

  async getFlexiTrends() {
    const flexiRegRepo = this.flexiRequestRepo;
    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await flexiRegRepo.count({
        where: {
          created_at: Between(date, endOfDay),
        },
      });

      trends.push({
        date: date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        count: count,
      });
    }

    return trends;
  }
}
