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
  HttpStatus,
  Res,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { VirtualWalletService } from './virtual-wallet.service';
import { VirtualAccountService } from './virtual-account.service';
import {
  VirtualWalletResponseDto,
  UpdateVirtualWalletDto,
  VirtualWalletTransactionDto,
  VirtualWalletTransactionResponseDto,
  GetWalletTransactionsDto,
} from './dto/virtual-wallet.dto';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';
import { GetWalletTransactionsDTO } from './dto/GetWalletTransactionsDto.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@ApiTags('Virtual Wallet')
@Controller('virtual-wallet')
export class VirtualWalletController {
  private readonly logger = new Logger(VirtualWalletController.name);

  constructor(
    private readonly virtualWalletService: VirtualWalletService,
    private readonly virtualAccountService: VirtualAccountService,
  ) {}

  @Post()
  @AuditLogger('CreateVirtualAccount')
  @ApiOperation({
    summary: 'Create Dual Virtual Wallets',
    description:
      'Triggers the creation of both RMB and UBA virtual accounts for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Virtual wallets created successfully',
  })
  async createVirtualAccount(@Req() req: Request, @Res() res: Response) {
    const { user_id } = req['whoAmmI'];

    try {
      this.logger.log(
        `Initiating dual virtual account creation for user ID: ${user_id}`,
      );
      const result = await this.virtualAccountService.createVirtualAccount(
        user_id,
      );

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Virtual accounts and wallets created successfully',
        data: {
          virtual_account: result.virtualWallet,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create dual virtual accounts for user ID: ${user_id}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to create virtual accounts',
      });
    }
  }

  @Get()
  @AuditLogger('GetUserVirtualWallets')
  @ApiOperation({
    summary: 'Get User Virtual Wallets',
    description: 'Retrieves all virtual wallets for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Virtual wallets retrieved successfully',
    type: [VirtualWalletResponseDto],
  })
  async getUserVirtualWallets(@Req() request: Request) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Fetching virtual wallets for user ID: ${user_id}`);

    try {
      const wallets = await this.virtualWalletService.getUserVirtualWallets(
        user_id,
      );

      this.logger.log(
        `Successfully retrieved ${wallets.length} virtual wallets for user ID: ${user_id}`,
      );

      // Auto-create missing wallets in the background (fire-and-forget)
      const { hasRmbWallet, hasUbaWallet } =
        this.virtualWalletService.checkWalletProviders(wallets);

      if (!hasRmbWallet || !hasUbaWallet) {
        this.logger.log(
          `[AUTO-CREATE] User ${user_id} is missing wallets — hasRmb: ${hasRmbWallet}, hasUba: ${hasUbaWallet}. Triggering background creation.`,
        );
        // Fire-and-forget: don't block the response
        this.virtualAccountService
          .createVirtualAccount(user_id)
          .then(() =>
            this.logger.log(
              `[AUTO-CREATE] Background wallet creation completed for user ${user_id}`,
            ),
          )
          .catch((err) =>
            this.logger.error(
              `[AUTO-CREATE] Background wallet creation failed for user ${user_id}: ${err.message}`,
            ),
          );
      }

      return {
        success: true,
        message: 'Virtual wallets retrieved successfully',
        data: wallets,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve virtual wallets for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('')
  @AuditLogger('GetVirtualWalletByAccountNumber')
  @ApiOperation({
    summary: 'Get Virtual Wallet by Account Number',
    description: 'Retrieves a specific virtual wallet by account number',
  })
  @ApiParam({ name: 'accountNumber', description: 'Virtual account number' })
  @ApiResponse({
    status: 200,
    description: 'Virtual wallet retrieved successfully',
    type: VirtualWalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Virtual wallet not found',
  })
  async getVirtualWalletByAccountNumber(@Req() request: Request) {
    const { user_id } = request['whoAmmI'];

    try {
      const wallet =
        await this.virtualWalletService.getVirtualWalletByAccountNumber(
          user_id,
        );

      this.logger.log(
        `Successfully retrieved virtual wallet for user ID: ${user_id}`,
      );

      return {
        success: true,
        message: 'Virtual wallet retrieved successfully',
        data: wallet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve virtual wallet for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':accountNumber')
  @AuditLogger('UpdateVirtualWallet')
  @ApiOperation({
    summary: 'Update Virtual Wallet',
    description: 'Updates virtual wallet information',
  })
  @ApiParam({ name: 'accountNumber', description: 'Virtual account number' })
  @ApiResponse({
    status: 200,
    description: 'Virtual wallet updated successfully',
    type: VirtualWalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Virtual wallet not found',
  })
  async updateVirtualWallet(
    @Body() updateData: UpdateVirtualWalletDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Update data:`, JSON.stringify(updateData, null, 2));

    try {
      const wallet = await this.virtualWalletService.updateVirtualWallet(
        user_id,
        updateData,
      );

      this.logger.log(
        `Successfully updated virtual wallet for user ID: ${user_id}`,
      );

      return {
        success: true,
        message: 'Virtual wallet updated successfully',
        data: wallet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update virtual wallet for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('transaction/:id')
  @AuditLogger('GetVirtualWalletTransactionById')
  @ApiOperation({
    summary: 'Get Virtual Wallet Transaction by ID',
    description:
      'Retrieves the details of a specific transaction by its ID for the user’s virtual wallet',
  })
  @ApiParam({ name: 'id', required: true, description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getWalletTransactionById(
    @Param('id') id: number,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(
      `Fetching wallet transaction ID: ${id} for user ID: ${user_id}`,
    );

    try {
      const transaction =
        await this.virtualWalletService.getWalletTransactionById(user_id, id);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Transaction retrieved successfully',
        data: transaction,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve transaction ID: ${id} for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':accountNumber/transactions')
  @AuditLogger('ProcessVirtualWalletTransaction')
  @ApiOperation({
    summary: 'Process Virtual Wallet Transaction',
    description:
      'Processes a credit or debit transaction for the virtual wallet',
  })
  @ApiParam({ name: 'accountNumber', description: 'Virtual account number' })
  @ApiResponse({
    status: 201,
    description: 'Transaction processed successfully',
    type: VirtualWalletTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid transaction data or insufficient balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Virtual wallet not found',
  })
  async processTransaction(
    @Param('accountNumber') accountNumber: string,
    @Body() transactionData: VirtualWalletTransactionDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(
      `Processing transaction for user ID: ${user_id}, account: ${accountNumber}`,
    );
    this.logger.log(
      `Transaction data:`,
      JSON.stringify(transactionData, null, 2),
    );

    try {
      const transaction = await this.virtualWalletService.processTransaction(
        user_id,
        accountNumber,
        transactionData,
      );

      this.logger.log(
        `Transaction processed successfully: ${transaction.transaction_reference}`,
      );

      return {
        success: true,
        message: 'Transaction processed successfully',
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process transaction for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('transactions')
  @AuditLogger('GetVirtualWalletTransactions')
  @ApiOperation({
    summary: 'Get Virtual Wallet Transactions',
    description:
      'Retrieves transaction history for the user’s virtual wallet with pagination, search, and filtering',
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
    name: 'transaction_type',
    required: false,
    description: 'Filter by transaction type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by transaction status',
  })
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
    description: 'Keyword search in reference, narration, or transaction ID',
  })
  @ApiQuery({
    name: 'account_number',
    required: false,
    description: 'Filter transactions by specific virtual account number',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual wallet not found' })
  async getWalletTransactions(
    @Query() queryParams: GetWalletTransactionsDTO,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(`Fetching wallet transactions for user ID: ${user_id}`);
    this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

    try {
      const result = await this.virtualWalletService.getWalletTransactions(
        user_id,
        queryParams,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Transactions retrieved successfully',
        data: result.transactions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve transactions for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('/balance')
  @AuditLogger('GetVirtualWalletBalance')
  @ApiOperation({
    summary: 'Get Virtual Wallet Balance',
    description:
      'Retrieves the current balance and summary for a virtual wallet',
  })
  @ApiParam({ name: 'accountNumber', description: 'Virtual account number' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Virtual wallet not found',
  })
  async getWalletBalance(
    @Param('accountNumber') accountNumber: string,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];

    this.logger.log(
      `Fetching balance for user ID: ${user_id}, account: ${accountNumber}`,
    );

    try {
      const wallet =
        await this.virtualWalletService.getVirtualWalletByAccountNumber(
          user_id,
        );

      const balanceInfo = {
        virtual_account_number: wallet.virtual_account_number,
        virtual_account_name: wallet.virtual_account_name,
        current_balance: wallet.current_balance,
        total_credited: wallet.total_credited,
        total_debited: wallet.total_debited,
        status: wallet.status,
        bank_code: wallet.bank_code,
        amount_control: wallet.amount_control,
        is_primary: wallet.is_primary,
      };

      this.logger.log(`Successfully retrieved balance for user ID: ${user_id}`);

      return {
        success: true,
        message: 'Balance retrieved successfully',
        data: balanceInfo,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve balance for user ID: ${user_id}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete('admin/:walletId/local-reset')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({
    summary: 'Local DB Reset of Virtual Account',
    description:
      'Bypasses audit triggers to delete local records for a virtual account and its transactions. Does NOT affect the third-party state.',
  })
  @ApiParam({ name: 'walletId', description: 'The internal ID of the wallet' })
  @ApiResponse({
    status: 200,
    description: 'Local reset performed successfully',
  })
  async localReset(@Param('walletId') walletId: number) {
    this.logger.log(`[ADMIN] Request to locally reset wallet ID: ${walletId}`);
    await this.virtualWalletService.localResetVirtualWallet(walletId);
    return {
      success: true,
      message: 'Local reset performed successfully',
    };
  }
}
