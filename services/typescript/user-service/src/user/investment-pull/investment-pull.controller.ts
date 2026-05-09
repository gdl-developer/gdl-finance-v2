import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Logger,
  HttpStatus,
  Query,
  Post,
  Body,
  NotAcceptableException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';
import { InvestmentPoolService } from './investment-pull.service';
import {
  InvestmentPoolStatus,
  InvestmentPoolType,
} from './entities/investment-pull.entity';
import { DailyAccrualLog } from './entities/investment-pool-accrued-log.entity';

@ApiTags('Investment Pool')
@Controller('investment-pool')
export class InvestmentPoolController {
  private readonly logger = new Logger(InvestmentPoolController.name);

  constructor(private readonly investmentPoolService: InvestmentPoolService) {}

  /**
   * 👤 Fetch a user’s investment pool by type
   */
  @Get('/user/:type')
  @AuditLogger('GetUserInvestmentPoolByType')
  @ApiOperation({
    summary: 'Fetch user investment pool by type',
    description:
      'Retrieves the investment pool record for a user based on the specified investment type (e.g., MMF, FIXED, EQUITY).',
  })
  @ApiParam({
    name: 'type',
    enum: InvestmentPoolType,
    description: 'Type of investment pool (e.g., MMF, FIXED, EQUITY)',
  })
  @ApiResponse({
    status: 200,
    description: 'User investment pool fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Investment pool not found for this user and type',
  })
  async getUserInvestmentPoolByType(
    @Param('type') type: InvestmentPoolType,
    @Param('cust') cust: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];
    this.logger.log(`Fetching ${type} investment pool for user ID: ${user_id}`);
    if (!cust) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'cust parameter is required',
      });
    }
    try {
      const pool = await this.investmentPoolService.getUserInvestmentPoolByType(
        user_id,
        type,
        cust,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'User investment pool fetched successfully',
        data: pool,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch ${type} pool for user ID: ${user_id}`,
        error.stack,
      );

      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Unable to fetch user investment pool',
      });
    }
  }

  /**
   * GET /investment-pools/user/:userId
   * Fetch all investment pools belonging to a specific user
   */
  @Get('investments/all')
  async getUserPools(@Req() request: Request, @Res() res: Response) {
    const { user_id } = request['whoAmmI'];
    const pools = await this.investmentPoolService.getUserPools(user_id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User investment pool fetched successfully',
      data: pools,
    });
  }
}
