import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { VirtualAccountService } from './virtual-account.service';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';
import { CreateVirtualAccountResponseDto } from './dto/create-virtual-account.dto';
import { VirtualWalletTransactionResponseDto } from './dto/virtual-wallet.dto';
import { RequestInterceptor } from '../../common/interceptors/request.interceptor';
import { Public } from '../../common/decorators/public.decorator'; // ✅ imported

@ApiTags('Virtual Account')
@Controller('virtual-account')
export class VirtualAccountController {
  private readonly logger = new Logger(VirtualAccountController.name);

  constructor(private readonly virtualAccountService: VirtualAccountService) {}

  /**
   * Process Virtual Account Credit Callback
   * (Public endpoint for external systems e.g. RMB, banks)
   */
  @Post('callback')
  @Public() // ✅ Skips RequestInterceptor auth validation
  @HttpCode(HttpStatus.OK)
  @AuditLogger('HandleVirtualAccountCallback')
  @ApiOperation({
    summary: 'Process Virtual Account Credit Callback',
    description:
      'Handles credit notifications from RMB or other banks, credits user wallet, and creates a transaction record.',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback processed successfully',
    type: VirtualWalletTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or incomplete callback payload',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate transaction detected',
  })
  async handleVirtualAccountCallback(
    @Req() req: Request,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    console.log(`Incoming request IP: ${req.ip}`);
    this.logger.log(
      'Received virtual account callback payload:',
      JSON.stringify(payload),
    );
    try {
      await this.virtualAccountService.processVirtualAccountCreditCallback(
        payload,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Virtual account credited successfully',
      });
    } catch (error) {
      this.logger.error(
        'Error processing virtual account callback',
        error.stack,
      );
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Error processing callback',
      });
    }
  }
}
