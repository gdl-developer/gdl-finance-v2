import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Logger,
  UseGuards,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { InvestmentRequestService } from '../../user/investment-request/investment-request.service';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from '../../common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from '../../common/casl-ability-rbac/abilities.guard';
import { Action } from '../../common/casl-ability-rbac/ability.factory';
import { MMFInvestmentRequest } from '../../user/investment-request/entities/investment-request.entity';
import {
  ApproveInvestmentRequestAdminDto,
  ApproveWithdrawalRequestAdminDto,
  GetInvestmentRequestsAdminDto,
  InvestmentRequestResponseAdminDto,
  RejectInvestmentRequestAdminDto,
  RejectWithdrawalRequestAdminDto,
  AddDailyAccrualDto,
} from './dto/investment-request.dto';
import { CanaryInvestmentRequestService } from 'src/user/investment-request-canary/investment-request.service';
import { InvestmentRequestIncomeService } from 'src/user/investment-request-income/investment-request.service';
import {
  InvestmentPoolStatus,
  InvestmentPoolType,
} from 'src/user/investment-pull/entities/investment-pull.entity';
import { InvestmentPoolService } from 'src/user/investment-pull/investment-pull.service';

@ApiTags('Admin - Investment Approvals')
@Controller('admin/investment-approvals')
@UseGuards(AbilitiesGuard)
export class InvestmentApprovalController {
  private readonly logger = new Logger(InvestmentApprovalController.name);
  // MMFInvestmentRequest
  constructor(
    private readonly investmentRequestService: InvestmentRequestService,
    private readonly canaryInvestmentRequestService: CanaryInvestmentRequestService,
    private readonly investmentRequestIncomeService: InvestmentRequestIncomeService,
    private readonly InnvestmentPoolService: InvestmentPoolService,
  ) {}
  //InvestmentRequestAdminService
  @Get()
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetAllInvestmentRequests')
  @ApiOperation({
    summary: 'Get All Investment Requests (Admin)',
    description:
      'Retrieves all investment requests for admin review with pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'fund', required: false, description: 'Filter by fund' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Start date for filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'End date for filtering (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment requests retrieved successfully',
  })
  async getAllInvestmentRequests(
    @Query() queryParams: GetInvestmentRequestsAdminDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    let result;
    this.logger.log(`Admin ID: ${user_id} fetching all investment requests`);
    this.logger.log(`Query params:`, JSON.stringify(queryParams, null, 2));

    try {
      if (queryParams.type === 'mmf') {
        result =
          await this.investmentRequestService.getAllInvestmentRequests(
            queryParams,
          );
      } else if (queryParams.type === 'canary') {
        result =
          await this.canaryInvestmentRequestService.getAllInvestmentRequests(
            queryParams,
          );
      } else if (queryParams.type === 'income') {
        result =
          await this.investmentRequestIncomeService.getAllInvestmentRequests(
            queryParams,
          );
      } else {
        throw new NotFoundException(
          'Invalid investment type specified. Must be one of: mmf, canary, income.',
        );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Investment requests retrieved successfully',
        data: result.requests,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve investment requests`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('/withdrawals')
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetPendingInvestmentRequests')
  @ApiOperation({
    summary: 'Get Pending Investment Requests (Admin)',
    description:
      'Retrieves all pending investment requests for admin approval, with support for filtering by type',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by investment type (mmf, canary, income)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending investment requests retrieved successfully',
  })
  async getPendingInvestmentRequests(
    @Query() queryParams: GetInvestmentRequestsAdminDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    let result;
    this.logger.log(
      `Admin ID: ${user_id} fetching pending investment requests`,
    );
    this.logger.log(`Query params:`, JSON.stringify(queryParams, null, 2));

    try {
      // Default to 'PROCESSING' if no status provided, allow 'ALL' to fetch everything
      const statusParam = queryParams.status
        ? queryParams.status.toUpperCase()
        : 'PROCESSING';
      const statusFilter =
        statusParam === 'ALL' ? undefined : queryParams.status;
      const pendingQueryParams = {
        ...queryParams,
        status: statusFilter as any,
      };

      // Handle multiple investment types
      if (pendingQueryParams.type === 'mmf') {
        result =
          await this.investmentRequestService.getAllRedemptionFund(
            pendingQueryParams,
          );
      } else if (pendingQueryParams.type === 'canary') {
        result =
          await this.canaryInvestmentRequestService.getAllCanaryRedemptionFund(
            pendingQueryParams,
          );
      } else if (pendingQueryParams.type === 'income') {
        result =
          await this.investmentRequestIncomeService.getAllIncomeRedemptionFund(
            pendingQueryParams,
          );
      } else {
        throw new NotFoundException(
          'Invalid investment type specified. Must be one of: mmf, canary, income.',
        );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Pending investment requests retrieved successfully',
        data: result.requests,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve pending investment requests`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id/withdrawal')
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetPendingInvestmentRequests')
  @ApiOperation({
    summary: 'Get withdrawal request via (Admin)',
    description:
      'Retrieve a withdrawal request for admin approval, with support for filtering by type',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by investment type (mmf, canary, income)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending investment requests retrieved successfully',
  })
  async getRequestByID(
    @Query() queryParams: GetInvestmentRequestsAdminDto,
    @Req() request: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Query('type') type: string,
  ) {
    const { user_id } = request['whoAmmI'];
    let result;
    this.logger.log(
      `Admin ID: ${user_id} fetching pending investment requests`,
    );
    this.logger.log(`Query params:`, JSON.stringify(queryParams, null, 2));

    try {
      // Always force status to 'PENDING'
      const pendingQueryParams = Number(id);
      console.log('pendingQueryParams', pendingQueryParams);

      // Handle multiple investment types
      if (type === 'mmf') {
        result =
          await this.investmentRequestService.getRedemptionFundById(
            pendingQueryParams,
          );
      } else if (type === 'canary') {
        result =
          await this.canaryInvestmentRequestService.getCanaryRedemptionFundById(
            pendingQueryParams,
          );
      } else if (type === 'income') {
        result =
          await this.investmentRequestIncomeService.getCIncomeRedemptionFundById(
            pendingQueryParams,
          );
      } else {
        throw new NotFoundException(
          'Invalid investment type specified. Must be one of: mmf, canary, income.',
        );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Pending investment requests retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve pending investment requests`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/approve')
  @CheckAbilities({ action: Action.Update, subject: MMFInvestmentRequest })
  @AuditLogger('AdminApproveInvestmentRequest')
  @ApiOperation({
    summary: 'Approve Investment Request (Admin)',
    description:
      'Approves an investment request and sends it to the appropriate fund API (Symplus, Canary, or Income Fund).',
  })
  @ApiParam({ name: 'id', description: 'Investment request ID' })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of investment (mmf, canary, or income)',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment request approved successfully',
    type: InvestmentRequestResponseAdminDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Request is not pending approval',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment request not found',
  })
  async approveInvestmentRequest(
    @Param('id') id: string,
    @Query('type') queryType: string,
    @Body() approveData: ApproveInvestmentRequestAdminDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];
    const requestId = parseInt(id);

    // Determine type (Query param takes precedence, fallback to Body)
    const type = queryType || approveData.type;

    console.log(
      `Admin ID: ${user_id} approving investment request ID: ${requestId}, Type: ${type}`,
    );
    console.log(`Approval data: ${JSON.stringify(approveData, null, 2)}`);

    try {
      if (!type) {
        throw new BadRequestException(
          'Investment type is required (query param or body)',
        );
      }

      let result;

      switch (type) {
        case 'mmf':
          result = await this.investmentRequestService.approveInvestmentRequest(
            requestId,
            user_id,
            approveData,
          );
          break;

        case 'canary':
          result =
            await this.canaryInvestmentRequestService.approveInvestmentRequest(
              requestId,
              user_id,
              approveData,
            );
          break;

        case 'income':
          result =
            await this.investmentRequestIncomeService.approveInvestmentRequest(
              requestId,
              user_id,
              approveData,
            );
          break;

        default:
          throw new NotFoundException(
            'Invalid investment type specified. Must be one of: mmf, canary, income.',
          );
      }

      this.logger.log(
        `Admin successfully approved ${type} investment request ID: ${requestId}`,
      );

      return {
        success: true,
        message: `Investment request approved successfully and sent to ${type.toUpperCase()} API`,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to approve ${type} investment request ID: ${requestId}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/reject')
  @CheckAbilities({ action: Action.Update, subject: MMFInvestmentRequest })
  @AuditLogger('AdminRejectInvestmentRequest')
  @ApiOperation({
    summary: 'Reject Investment Request (Admin)',
    description:
      'Rejects an investment request with admin notes for MMF, Canary, or Income funds',
  })
  @ApiParam({ name: 'id', description: 'Investment request ID' })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of investment (mmf, canary, or income)',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment request rejected successfully',
    type: InvestmentRequestResponseAdminDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Request is not pending approval',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment request not found',
  })
  async rejectInvestmentRequest(
    @Param('id') id: string,
    @Query('type') queryType: string,
    @Body() rejectData: RejectInvestmentRequestAdminDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];
    const requestId = parseInt(id);

    // Determine type (Query param takes precedence, fallback to Body)
    const type = queryType || rejectData.type;

    this.logger.log(
      `Admin ID: ${user_id} rejecting ${type} investment request ID: ${requestId}`,
    );
    this.logger.log(`Rejection data: ${JSON.stringify(rejectData, null, 2)}`);

    try {
      let result;

      switch (type) {
        case 'mmf':
          result = await this.investmentRequestService.rejectInvestmentRequest(
            requestId,
            user_id,
            rejectData,
          );
          break;

        case 'canary':
          result =
            await this.canaryInvestmentRequestService.rejectInvestmentRequest(
              requestId,
              user_id,
              rejectData,
            );
          break;

        case 'income':
          result =
            await this.investmentRequestIncomeService.rejectInvestmentRequest(
              requestId,
              user_id,
              rejectData,
            );
          break;

        default:
          throw new NotFoundException(
            'Invalid investment type specified. Must be one of: mmf, canary, income.',
          );
      }

      this.logger.log(
        `Admin successfully rejected ${type} investment request ID: ${requestId}`,
      );

      return {
        success: true,
        message: `Investment request rejected successfully for ${type.toUpperCase()} fund`,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to reject ${type} investment request ID: ${requestId}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/withdrawal/approve')
  @CheckAbilities({ action: Action.Update, subject: MMFInvestmentRequest })
  @AuditLogger('AdminApproveInvestmentRequest')
  @ApiOperation({
    summary: 'Approve Withdrawal Request (Admin)',
    description:
      'Approves a users withdrawal request and deducts the redeemed funds from their investment pool.',
  })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request approved successfully',
    type: InvestmentRequestResponseAdminDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Request is not pending approval or invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  async approveWithdrawalRequest(
    @Param('id') id: string,
    @Body() approveData: ApproveWithdrawalRequestAdminDto,
    @Req() request: Request,
  ) {
    const { user_id: adminId } = request['whoAmmI'];
    const requestId = parseInt(id);

    this.logger.log(
      `Admin ID ${adminId} attempting to approve withdrawal request ID ${requestId}`,
    );
    this.logger.debug(
      `Approval payload: ${JSON.stringify(approveData, null, 2)}`,
    );

    try {
      const { type } = approveData;

      // Validate required fields
      if (!type) {
        throw new BadRequestException('Missing required fields: type.');
      }

      let result;
      const poolType =
        type === 'mmf'
          ? InvestmentPoolType.MMF
          : type === 'canary'
            ? InvestmentPoolType.CANARY
            : type === 'income'
              ? InvestmentPoolType.INCOME
              : undefined;

      if (!poolType) {
        throw new NotFoundException(
          'Invalid investment type specified. Must be one of: mmf, canary, income.',
        );
      }

      // Call the appropriate fund redemption approval service
      if (poolType === InvestmentPoolType.MMF) {
        result =
          await this.investmentRequestService.approveFundRedemptionRequest(
            requestId,
            adminId,
          );
      } else if (poolType === InvestmentPoolType.CANARY) {
        result =
          await this.canaryInvestmentRequestService.approveCanaryFundRedemptionRequest(
            requestId,
            adminId,
          );
      } else if (poolType === InvestmentPoolType.INCOME) {
        result =
          await this.investmentRequestIncomeService.approveIncomeFundRedemptionRequest(
            requestId,
            adminId,
          );
      }

      return {
        success: true,
        message: 'Withdrawal request approved successfully.',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve withdrawal request ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/withdrawal/reject')
  @CheckAbilities({ action: Action.Update, subject: MMFInvestmentRequest })
  @AuditLogger('AdminRejectWithdrawalRequest')
  @ApiOperation({
    summary: 'Reject Withdrawal Request (Admin)',
    description: 'Rejects a users withdrawal request with admin notes.',
  })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request rejected successfully',
    type: InvestmentRequestResponseAdminDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Request is not pending approval or invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  async rejectWithdrawalRequest(
    @Param('id') id: string,
    @Body() rejectData: RejectWithdrawalRequestAdminDto,
    @Req() request: Request,
  ) {
    const { user_id: adminId } = request['whoAmmI'];
    const requestId = parseInt(id);

    this.logger.log(
      `Admin ID ${adminId} attempting to reject withdrawal request ID ${requestId}`,
    );
    this.logger.debug(
      `Rejection payload: ${JSON.stringify(rejectData, null, 2)}`,
    );

    try {
      const { type, admin_notes } = rejectData;

      // Validate required fields
      if (!type) {
        throw new BadRequestException('Missing required fields: type.');
      }

      if (!admin_notes) {
        throw new BadRequestException(
          'Admin notes are required for rejection.',
        );
      }

      let result;
      const poolType =
        type === 'mmf'
          ? InvestmentPoolType.MMF
          : type === 'canary'
            ? InvestmentPoolType.CANARY
            : type === 'income'
              ? InvestmentPoolType.INCOME
              : undefined;

      if (!poolType) {
        throw new NotFoundException(
          'Invalid investment type specified. Must be one of: mmf, canary, income.',
        );
      }

      // Call the appropriate fund redemption rejection service
      if (poolType === InvestmentPoolType.MMF) {
        result =
          await this.investmentRequestService.rejectFundRedemptionRequest(
            requestId,
            adminId,
            admin_notes,
          );
      } else if (poolType === InvestmentPoolType.CANARY) {
        result =
          await this.canaryInvestmentRequestService.rejectCanaryFundRedemptionRequest(
            requestId,
            adminId,
            admin_notes,
          );
      } else if (poolType === InvestmentPoolType.INCOME) {
        result =
          await this.investmentRequestIncomeService.rejectIncomeFundRedemptionRequest(
            requestId,
            adminId,
            admin_notes,
          );
      }

      return {
        success: true,
        message: 'Withdrawal request rejected successfully.',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reject withdrawal request ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('aggregate')
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetInvestmentAggregates')
  @ApiOperation({
    summary: 'Get Investment Aggregates (Admin)',
    description:
      'Retrieves aggregated data including total amount and subscriber counts by investment type',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment aggregates retrieved successfully',
  })
  async getInvestmentAggregates(@Req() request: Request, @Res() res: Response) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Admin ID: ${user_id} fetching investment aggregates`);

    try {
      const getAggregatedData = async (repository: any) => {
        const stats = await repository
          .createQueryBuilder('request')
          .select('SUM(request.price)', 'total_amount')
          .addSelect('COUNT(DISTINCT request.user_id)', 'subscribers')
          .addSelect('COUNT(request.id)', 'total_requests')
          .getRawOne();

        return {
          totalAmount: Number(stats?.total_amount || 0),
          subscribers: Number(stats?.subscribers || 0),
          totalRequests: Number(stats?.total_requests || 0),
        };
      };

      const [mmfStats, canaryStats, incomeStats] = await Promise.all([
        getAggregatedData(
          this.investmentRequestService.investmentRequestRepository,
        ),
        getAggregatedData(
          this.canaryInvestmentRequestService.investmentRequestRepository,
        ),
        getAggregatedData(
          this.investmentRequestIncomeService.investmentRequestRepository,
        ),
      ]);

      const totalAmount =
        mmfStats.totalAmount +
        canaryStats.totalAmount +
        incomeStats.totalAmount;

      const aggregates = {
        totalAmount: totalAmount.toFixed(2),
        mmfSubscribers: mmfStats.subscribers,
        canarySubscribers: canaryStats.subscribers,
        incomeSubscribers: incomeStats.subscribers,
        breakdown: {
          mmf: {
            totalAmount: mmfStats.totalAmount.toFixed(2),
            subscribers: mmfStats.subscribers,
            totalRequests: mmfStats.totalRequests,
          },
          canary: {
            totalAmount: canaryStats.totalAmount.toFixed(2),
            subscribers: canaryStats.subscribers,
            totalRequests: canaryStats.totalRequests,
          },
          income: {
            totalAmount: incomeStats.totalAmount.toFixed(2),
            subscribers: incomeStats.subscribers,
            totalRequests: incomeStats.totalRequests,
          },
        },
      };

      this.logger.log(
        `Admin retrieved investment aggregates:`,
        JSON.stringify(aggregates, null, 2),
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Investment aggregates retrieved successfully',
        data: aggregates,
      });
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve investment aggregates`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('statistics')
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetInvestmentStatistics')
  @ApiOperation({
    summary: 'Get Investment Request Statistics (Admin)',
    description: 'Retrieves statistics about investment requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment statistics retrieved successfully',
  })
  async getInvestmentStatistics(@Req() request: Request) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Admin ID: ${user_id} fetching investment statistics`);

    try {
      // Get counts for each status
      const [pending, approved, rejected, processing, completed, failed] =
        await Promise.all([
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'PENDING' as any,
            limit: 1,
          }),
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'APPROVED' as any,
            limit: 1,
          }),
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'REJECTED' as any,
            limit: 1,
          }),
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'PROCESSING' as any,
            limit: 1,
          }),
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'COMPLETED' as any,
            limit: 1,
          }),
          this.investmentRequestService.getAllInvestmentRequests({
            status: 'FAILED' as any,
            limit: 1,
          }),
        ]);

      const statistics = {
        pending: pending.total,
        approved: approved.total,
        rejected: rejected.total,
        processing: processing.total,
        completed: completed.total,
        failed: failed.total,
        total:
          pending.total +
          approved.total +
          rejected.total +
          processing.total +
          completed.total +
          failed.total,
      };

      this.logger.log(
        `Admin retrieved investment statistics:`,
        JSON.stringify(statistics, null, 2),
      );

      return {
        success: true,
        message: 'Investment statistics retrieved successfully',
        data: statistics,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve investment statistics`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @CheckAbilities({ action: Action.Read, subject: MMFInvestmentRequest })
  @AuditLogger('AdminGetInvestmentRequestById')
  @ApiOperation({
    summary: 'Get Investment Request by ID (Admin)',
    description:
      'Retrieves a specific investment request for admin review based on the provided type and ID.',
  })
  @ApiParam({ name: 'id', description: 'Investment request ID' })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of investment (mmf, canary, or income)',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment request retrieved successfully',
  })
  async getInvestmentRequestById(
    @Param('id') id: number,
    @Query('type') type: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    this.logger.log(
      `Admin ID: ${user_id} fetching investment request ID: ${id}, Type: ${type}`,
    );

    try {
      let result;

      switch (type) {
        case 'mmf':
          result = await this.investmentRequestService.getInvestmentRequestById(
            user_id,
            id,
          );
          break;

        case 'canary':
          result =
            await this.canaryInvestmentRequestService.getInvestmentRequestById(
              user_id,
              id,
            );
          break;

        case 'income':
          result =
            await this.investmentRequestIncomeService.getInvestmentRequestById(
              user_id,
              id,
            );
          break;

        default:
          throw new NotFoundException(
            'Invalid investment type specified. Must be one of: mmf, canary, income.',
          );
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Investment request retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Admin failed to retrieve investment request ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * ➕ Add daily accrued gain or loss to a pool
   */
  @Post(':poolId/accrual')
  @ApiOperation({ summary: 'Add daily accrued gain or loss for a pool' })
  @ApiParam({ name: 'poolId', type: Number, description: 'Investment pool ID' })
  @ApiResponse({ status: 201, description: 'Daily accrual added successfully' })
  @ApiResponse({ status: 404, description: 'Pool or admin not found' })
  async addDailyAccrual(
    @Param('poolId') poolId: number,
    @Body() body: AddDailyAccrualDto,
    @Res() res: Response,
  ) {
    try {
      const { adminId, type, gain = '0.00', loss = '0.00' } = body;
      this.logger.log(
        `Adding daily accrual to pool ${poolId} by admin ${adminId}`,
      );

      const accrual = await this.InnvestmentPoolService.addDailyAccrual(
        poolId,
        adminId,
        type,
        gain,
        loss,
      );

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Daily accrual added successfully',
        data: accrual,
      });
    } catch (error) {
      this.logger.error('Failed to add daily accrual', error.stack);
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to add daily accrual',
      });
    }
  }

  /**
   * 🌍 Fetch all investment pools with optional filters
   */
  @Get('/investment-pools/getall')
  @AuditLogger('GetAllInvestmentPools')
  @ApiOperation({
    summary: 'Fetch all investment pools',
    description:
      'Retrieves investment pools across all users with optional filtering, search, pagination, and sorting.',
  })
  @ApiQuery({ name: 'type', enum: InvestmentPoolType, required: false })
  @ApiQuery({ name: 'status', enum: InvestmentPoolStatus, required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Full-text search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    type: Number,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order: ASC or DESC',
    enum: ['ASC', 'DESC'],
  })
  @ApiResponse({
    status: 200,
    description: 'Investment pools fetched successfully',
  })
  @ApiResponse({ status: 404, description: 'No investment pools found' })
  async getAllInvestmentPools(
    @Res() res: Response,
    @Query('type') type: InvestmentPoolType,
    @Query('status') status: InvestmentPoolStatus,
    @Query('search') search: string,
    @Query('page') page = 1,
    @Query('limit') limit?: number,
    @Query('sort') sort: 'ASC' | 'DESC' = 'DESC',
  ) {
    this.logger.log(
      `Fetching all investment pools | type: ${type || 'ALL'} | status: ${
        status || 'ALL'
      } | page: ${page} | limit: ${limit || 'NONE'}`,
    );

    try {
      const result = await this.InnvestmentPoolService.getAllPools(
        type,
        status,
        search,
        Number(page),
        limit ? Number(limit) : undefined,
        sort,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.response_description,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        data: result.data,
      });
    } catch (error) {
      this.logger.error('Failed to fetch investment pools', error.stack);
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Unable to fetch investment pools',
      });
    }
  }

  /**
   * 📅 Fetch daily accrual logs (with pagination, search, and filters)
   */
  @Get('/accruals')
  @AuditLogger('GetAllDailyAccrualLogs')
  @ApiOperation({
    summary: 'Fetch daily accrual logs',
    description:
      'Retrieves daily accrual logs across all pools. You can filter by pool ID, investment type, admin ID, or date range, and also search by admin or pool.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'poolId', required: false, type: Number })
  @ApiQuery({
    name: 'investmentType',
    required: false,
    enum: InvestmentPoolType,
  })
  @ApiQuery({ name: 'adminId', required: false, type: Number })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by admin name, business unit, or pool user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily accrual logs fetched successfully',
  })
  @ApiResponse({ status: 404, description: 'No daily accrual logs found' })
  async getAllAccruals(
    @Res() res: Response,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('poolId') poolId?: number,
    @Query('investmentType') investmentType?: InvestmentPoolType,
    @Query('adminId') adminId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    try {
      this.logger.log('Fetching daily accrual logs');

      const result = await this.InnvestmentPoolService.getAllAccruals(
        Number(page),
        Number(limit),
        poolId,
        investmentType,
        adminId,
        startDate,
        endDate,
        search,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Daily accrual logs fetched successfully',
        total: result.total,
        data: result.data,
      });
    } catch (error) {
      this.logger.error('Failed to fetch daily accrual logs', error.stack);

      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Unable to fetch daily accrual logs',
      });
    }
  }

  /**
   * 👤 Fetch a user’s investment pool by type
   */
  @Get('/investment-pools/:id')
  @AuditLogger('GetUserInvestmentPoolByType')
  @ApiOperation({
    summary: 'Fetch user investment pool by id',
    description: 'Retrieves a investment pool record.',
  })
  @ApiParam({
    name: 'id',
    description: 'The Id of the record',
  })
  @ApiResponse({
    status: 200,
    description: 'User investment pool fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment pool not found',
  })
  async getUserInvestmentPoolByType(
    @Param('id') id: number,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    this.logger.log(`Fetching ${id} investment pool for user ID: ${user_id}`);

    try {
      const pool = await this.InnvestmentPoolService.getInvestmentTypeById(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'User investment pool fetched successfully',
        data: pool,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch ${id} pool for user ID: ${user_id}`,
        error.stack,
      );

      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Unable to fetch user investment pool',
      });
    }
  }
}
