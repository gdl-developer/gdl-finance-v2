import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  Logger,
  Res,
  HttpStatus,
  BadRequestException,
  NotAcceptableException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { InvestmentRequestService } from './investment-request.service';
import {
  CreateInvestmentRequestDto,
  InvestmentRequestResponseDto,
  UpdateInvestmentRequestDto,
  GetInvestmentRequestsDto,
  CreateFundRedemptionDto,
  FundRedemptionResponseDto,
  GetRedemptionRequestsDto,
} from './dto/investment-request.dto';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';
import { Response } from 'express';
import { InvestmentPoolType } from '../investment-pull/entities/investment-pull.entity';

@ApiTags('Investment Requests')
@Controller('investment-requests')
export class InvestmentRequestController {
  private readonly logger = new Logger(InvestmentRequestController.name);

  constructor(
    private readonly investmentRequestService: InvestmentRequestService,
  ) {}

  @Post()
  @AuditLogger('CreateInvestmentRequest')
  @ApiOperation({
    summary: 'Create Investment Request',
    description: 'Creates a new investment request for admin approval',
  })
  @ApiResponse({
    status: 201,
    description: 'Investment request created successfully',
    type: InvestmentRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or duplicate external reference',
  })
  async createInvestmentRequest(
    @Body() createInvestmentRequestDto: CreateInvestmentRequestDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Creating investment request for user ID: ${user_id}`);
    this.logger.log(
      `Request data:`,
      JSON.stringify(createInvestmentRequestDto, null, 2),
    );

    if (createInvestmentRequestDto.price < 1000) {
      throw new NotAcceptableException('Minimum investment amount is ₦10,000');
    }

    try {
      const result =
        await this.investmentRequestService.createInvestmentRequest(
          user_id,
          createInvestmentRequestDto,
        );

      this.logger.log(
        `Investment request created successfully for user ID: ${user_id}`,
      );

      return {
        success: true,
        message:
          'Investment request created successfully and is pending approval',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create investment request for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  @AuditLogger('GetUserInvestmentRequests')
  @ApiOperation({
    summary: 'Get User Investment Requests',
    description:
      'Retrieves all investment requests for the authenticated user with pagination and filtering',
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
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'This is the search key',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment requests retrieved successfully',
  })
  async getUserInvestmentRequests(
    @Query() queryParams: GetInvestmentRequestsDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const user: any = request['whoAmmI'];
    const user_id = user?.user_id;

    this.logger.log(`Fetching investment requests for user ID: ${user_id}`);

    try {
      const result =
        await this.investmentRequestService.getUserInvestmentRequests(
          user_id,
          queryParams,
        );

      // Ensure defaults if result is empty
      const requests = Array.isArray(result.requests) ? result.requests : [];
      const total = typeof result.total === 'number' ? result.total : 0;
      const page =
        typeof result.page === 'number' ? result.page : queryParams.page || 1;
      const limit =
        typeof result.limit === 'number'
          ? result.limit
          : queryParams.limit || 20;

      this.logger.log(
        `Retrieved ${requests.length} investment requests for user ID: ${user_id}`,
      );

      return res.status(200).json({
        success: true,
        message: requests.length
          ? 'Investment requests retrieved successfully'
          : 'No investment requests found',
        data: requests,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve investment requests for user ID: ${user_id}`,
        error.stack,
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve investment requests',
        error: error.message,
      });
    }
  }

  @Get('fund-accounts')
  @AuditLogger('GetUserFundAccounts')
  @ApiOperation({
    summary: 'Get User Fund Accounts',
    description:
      'Fetches available fund accounts for the authenticated user using their Symplus customer ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund accounts retrieved successfully from Symplus',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Symplus customer ID not found',
  })
  @ApiResponse({
    status: 404,
    description: 'User virtual wallet not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to fetch fund accounts from Symplus',
  })
  async getUserFundAccounts(@Req() request: Request, @Res() res: Response) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Fetching fund accounts for user ID: ${user_id}`);

    try {
      const result =
        await this.investmentRequestService.getUserFundAccounts(user_id);

      return res.status(200).json({
        success: true,
        message: 'Fund accounts retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch fund accounts for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('fund-accounts/:customerId')
  @AuditLogger('GetCustomerFundAccounts')
  @ApiOperation({
    summary: 'Get Customer Fund Accounts (Legacy)',
    description:
      'Fetches available fund accounts for a given customer from Symplus. Use GET /fund-accounts instead for authenticated users.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer ID to fetch fund accounts for',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund accounts retrieved successfully from Symplus',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to fetch fund accounts from Symplus',
  })
  async getCustomerFundAccounts(
    @Param('customerId') customerId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Fetching fund accounts for customer: ${customerId}`);

    try {
      const result =
        await this.investmentRequestService.getCustomerFundAccounts(customerId);
      return res.status(200).json({
        success: true,
        message: 'Fund accounts retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch fund accounts for customer: ${customerId}`,
        error.stack,
      );
      throw error;
    }
  }

  // @Get('fund-price')
  // @AuditLogger('GetFundPrice')
  // @ApiOperation({
  //   summary: 'Get Fund Price',
  //   description: 'Fetches the current fund price from Symplus'
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Fund price retrieved successfully',
  // })
  // @ApiResponse({
  //   status: 500,
  //   description: 'Failed to fetch fund price',
  // })
  // async getFundPrice(@Res() res: Response) {
  //   this.logger.log(`Fetching fund price`);

  //   try {
  //     const result = await this.investmentRequestService.getFundPrice();

  //     return res.status(200).json({
  //       success: true,
  //       message: 'Fund price retrieved successfully',
  //       data: result,
  //     });
  //   } catch (error) {
  //     this.logger.error(`Failed to fetch fund price`, error.stack);
  //     return res.status(500).json({
  //       success: false,
  //       message: 'Failed to fetch fund price',
  //       error: error.message,
  //     });
  //   }
  // }

  @Get('redemptions')
  @AuditLogger('GetUserRedemptionRequests')
  @ApiOperation({
    summary: 'Get User Redemption Requests',
    description: 'Retrieves all redemption requests for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Redemption requests retrieved successfully',
  })
  async getUserRedemptions(
    @Query() queryParams: GetRedemptionRequestsDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Fetching redemptions for user ID: ${user_id}`);

    try {
      const result = await this.investmentRequestService.getUserRedemptions(
        user_id,
        queryParams,
      );

      return res.status(200).json({
        success: true,
        message: 'Redemption requests retrieved successfully',
        data: result.redemptions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages:
            result.limit > 0 ? Math.ceil(result.total / result.limit) : 0,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve redemptions for user ID: ${user_id}: ${error.message}`,
        error.stack,
      );
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve redemption requests',
        error: error.message,
      });
    }
  }

  @Get('total/active')
  @AuditLogger('GetUserTotalActiveInvestment')
  @ApiOperation({
    summary: 'Get Total Active Investment Amount',
    description:
      'Fetches the total amount of all active investment requests for the authenticated user, optionally filtered by investment pool type',
  })
  @ApiQuery({
    name: 'poolType',
    required: false,
    enum: InvestmentPoolType,
    description:
      'Optional filter by investment pool type (MMF, CANARY, INCOME)',
  })
  @ApiResponse({
    status: 200,
    description: 'Total active investment amount fetched successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Unable to fetch total active investment amount',
  })
  async getUserTotalActiveInvestment(
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];

    try {
      const total =
        await this.investmentRequestService.getUserTotalActiveInvestmentAmount(
          user_id,
        );

      this.logger.log(
        `Successfully fetched total active investment amount for user ID: ${user_id}`,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Total active investment amount fetched successfully',
        data: { total },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch total active investment amount for user ID: ${user_id}`,
        error.stack,
      );

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Unable to fetch total active investment amount',
        error: error.message,
      });
    }
  }

  @Get(':id')
  @AuditLogger('GetInvestmentRequestById')
  @ApiOperation({
    summary: 'Get Investment Request by ID',
    description: 'Retrieves a specific investment request by ID',
  })
  @ApiParam({ name: 'id', description: 'Investment request ID' })
  @ApiResponse({
    status: 200,
    description: 'Investment request retrieved successfully',
    type: InvestmentRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Investment request not found',
  })
  async getInvestmentRequestById(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    const requestId = parseInt(id);

    this.logger.log(
      `Fetching investment request ID: ${requestId} for user ID: ${user_id}`,
    );

    try {
      const result =
        await this.investmentRequestService.getInvestmentRequestById(
          user_id,
          requestId,
        );

      this.logger.log(
        `Successfully retrieved investment request ID: ${requestId} for user ID: ${user_id}`,
      );

      return res.status(200).json({
        success: true,
        message: 'Investment request retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve investment request ID: ${requestId} for user ID: ${user_id}: ${error.message}`,
        error.stack,
      );

      const status = error.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to retrieve investment request',
      });
    }
  }

  @Put(':id')
  @AuditLogger('UpdateInvestmentRequest')
  @ApiOperation({
    summary: 'Update Investment Request',
    description: 'Updates a pending investment request',
  })
  @ApiParam({ name: 'id', description: 'Investment request ID' })
  @ApiResponse({
    status: 200,
    description: 'Investment request updated successfully',
    type: InvestmentRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot update non-pending request',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment request not found',
  })
  async updateInvestmentRequest(
    @Param('id') id: string,
    @Body() updateInvestmentRequestDto: UpdateInvestmentRequestDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];
    const requestId = parseInt(id);

    this.logger.log(
      `Updating investment request ID: ${requestId} for user ID: ${user_id}`,
    );
    this.logger.log(
      `Update data:`,
      JSON.stringify(updateInvestmentRequestDto, null, 2),
    );

    try {
      const result =
        await this.investmentRequestService.updateInvestmentRequest(
          user_id,
          requestId,
          updateInvestmentRequestDto,
        );

      this.logger.log(
        `Successfully updated investment request ID: ${requestId} for user ID: ${user_id}`,
      );

      return {
        success: true,
        message: 'Investment request updated successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update investment request ID: ${requestId} for user ID: ${user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('fund-redemption')
  @AuditLogger('CreateFundRedemption')
  @ApiOperation({
    summary: 'Create Fund Redemption Request',
    description: 'Creates a fund redemption request via Symplus API',
  })
  @ApiResponse({
    status: 201,
    description: 'Fund redemption request created successfully',
    type: FundRedemptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid redemption data',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to process fund redemption',
  })
  async createFundRedemption(
    @Body() createFundRedemptionDto: CreateFundRedemptionDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Creating fund redemption request for user ID: ${user_id}`);
    this.logger.log(
      `Redemption data:`,
      JSON.stringify(createFundRedemptionDto, null, 2),
    );

    try {
      const result = await this.investmentRequestService.fundRedemption(
        user_id,
        createFundRedemptionDto,
      );

      this.logger.log(
        `Fund redemption request created successfully for user ID: ${user_id}`,
      );

      return {
        success: true,
        message: 'Fund redemption request processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create fund redemption for user ID: ${user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
