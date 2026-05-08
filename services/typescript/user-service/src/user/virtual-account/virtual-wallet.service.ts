import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  VirtualWallet,
  VirtualWalletStatus,
  VirtualWalletTransactionType,
} from './entities/virtual-wallet.entity';
import {
  VirtualWalletTransaction,
  TransactionStatus,
} from './entities/virtual-wallet-transaction.entity';
// import { CreateVirtualAccountResponseDto } from './dto/create-virtual-account.dto';
import {
  VirtualWalletResponseDto,
  UpdateVirtualWalletDto,
  VirtualWalletTransactionDto,
  VirtualWalletTransactionResponseDto,
  GetWalletTransactionsDto,
} from './dto/virtual-wallet.dto';
import { SymplusService } from './symplus.service';
import { GetWalletTransactionsDTO } from './dto/GetWalletTransactionsDto.dto';
import { EnvService } from '../../common/env.service';
import { ExternalApiCallsService } from '../../common/external-api-calls/external-api-calls.service';
import { InvestmentPoolType } from '../investment-pull/entities/investment-pull.entity';

@Injectable()
export class VirtualWalletService {
  private readonly logger = new Logger(VirtualWalletService.name);

  constructor(
    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,
    @InjectRepository(VirtualWalletTransaction)
    private readonly transactionRepository: Repository<VirtualWalletTransaction>,
    private readonly symplusService: SymplusService,
    private readonly envService: EnvService,
    private readonly externalApiCallsService: ExternalApiCallsService,
  ) {}

  async createVirtualWallet(
    userId: number,
    wallet: any,
    fetchUserNuban: any,
    responseFromRmb: any,
  ): Promise<VirtualWalletResponseDto> {
    this.logger.log(`Creating virtual wallet for user ID: ${userId}`);
    let savedWallet: VirtualWallet;
    try {
      // Check if user already has a virtual wallet with this account number
      const accountNumber =
        responseFromRmb?.data?.virtualaccount ||
        responseFromRmb?.virtualaccount ||
        responseFromRmb?.accountNumber;

      savedWallet = await this.virtualWalletRepository.findOne({
        where: {
          user_id: userId,
          virtual_account_number: accountNumber,
        },
      });
      if (!savedWallet) {
        // Check if this should be the primary wallet (first wallet for user)
        const userWalletCount = await this.virtualWalletRepository.count({
          where: { user_id: userId },
        });

        const isPrimary = userWalletCount === 0;

        const virtualWallet = this.virtualWalletRepository.create({
          user_id: userId,
          virtual_account_name: wallet.firstname + ' ' + wallet.lastname,
          virtual_account_number:
            responseFromRmb?.data?.virtualaccount ||
            responseFromRmb?.accountNumber ||
            responseFromRmb?.virtualaccount,
          bank_code:
            responseFromRmb?.data?.bankcode ||
            responseFromRmb?.bankCode ||
            (responseFromRmb?.accountNumber ? '033' : undefined),
          amount_control:
            responseFromRmb?.data?.amountcontrol || 'VARIABLEAMOUNT',
          response_message:
            responseFromRmb?.data?.responsemessage ||
            responseFromRmb?.message ||
            'SUCCESS',
          response_code:
            responseFromRmb?.data?.responsecode ||
            responseFromRmb?.responseCode ||
            '00',
          current_balance: 0.0,
          total_credited: 0.0,
          total_debited: 0.0,
          status: VirtualWalletStatus.ACTIVE,
          is_primary: isPrimary,
        });

        savedWallet = await this.virtualWalletRepository.save(virtualWallet);
        this.logger.log(
          `Virtual wallet created successfully for user ID: ${userId}, wallet ID: ${savedWallet.id}`,
        );
      }

      try {
        if (!savedWallet.encrypted_symplus_customer_id) {
          const symplusCustomer =
            await this.symplusService.createSymplusCustomer(
              userId,
              savedWallet.id,
              wallet,
              fetchUserNuban,
            );
          console.log(`Symplus customer created successfully`, symplusCustomer);
          savedWallet.encrypted_symplus_customer_id =
            symplusCustomer?.customer_id;
        }

        if (
          !savedWallet.encrypted_infoware_customer_id ||
          savedWallet.encrypted_infoware_customer_id === null
        ) {
          const infowareCustomer =
            await this.symplusService.createInfowareCustomer(
              userId,
              savedWallet.id,
              wallet,
              fetchUserNuban,
            );
          savedWallet.encrypted_infoware_customer_id =
            infowareCustomer?.customer_id;
        }

        // encrypted_infoware_customer_id
        await this.virtualWalletRepository.save(savedWallet);
      } catch (error) {
        this.logger.error(
          `Failed to create Symplus/Infoware customer for user ID: ${userId}. Suppressing error to allow wallet creation.`,
          error.stack,
        );
        // Don't fail the entire process if Symplus creation fails
        // The wallet is still created and can be used
        this.logger.warn(
          `Continuing with wallet creation despite Symplus failure for user ID: ${userId}. Error: ${error.message}`,
        );
      }

      return await this.mapToResponseDto(savedWallet);
    } catch (error) {
      this.logger.error(
        `Failed to create virtual wallet for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create virtual wallet');
    }
  }

  async getUserVirtualWallets(
    userId: number,
  ): Promise<VirtualWalletResponseDto[]> {
    this.logger.log(`Fetching virtual wallets for user ID: ${userId}`);

    try {
      const wallets = await this.virtualWalletRepository.find({
        where: { user_id: userId },
        order: { is_primary: 'DESC', created_at: 'ASC' },
      });

      this.logger.log(
        `Found ${wallets.length} virtual wallets for user ID: ${userId}`,
      );
      return Promise.all(
        wallets.map((wallet) => this.mapToResponseDto(wallet)),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch virtual wallets for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch virtual wallets');
    }
  }

  async getUserVirtualWalletsInternal(userId: number): Promise<any> {
    this.logger.log(`Fetching virtual wallets for user ID: ${userId}`);

    try {
      const wallets = await this.virtualWalletRepository.findOne({
        where: { user_id: userId },
      });
      return wallets;
    } catch (error) {
      this.logger.error(
        `Failed to fetch virtual wallets for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch virtual wallets');
    }
  }

  async findWalletForInvestment(
    userId: number,
    type: InvestmentPoolType,
  ): Promise<VirtualWallet> {
    this.logger.log(
      `Finding specific wallet for user ${userId} and investment type ${type}`,
    );

    let wallet: VirtualWallet;

    if (type === InvestmentPoolType.MMF) {
      // MMF specifically uses UBA (Bank Code 033)
      wallet = await this.virtualWalletRepository.findOne({
        where: { user_id: userId, bank_code: '033' },
      });
    } else {
      // Default to primary for CANARY and INCOME
      wallet = await this.virtualWalletRepository.findOne({
        where: { user_id: userId, is_primary: true },
      });
    }

    return wallet;
  }

  async getVirtualWalletByAccountNumber(
    userId: number,
  ): Promise<VirtualWalletResponseDto> {
    try {
      const wallet = await this.virtualWalletRepository.findOne({
        where: {
          user_id: userId,
        },
      });

      if (!wallet) {
        throw new NotFoundException('Virtual wallet not found');
      }

      return await this.mapToResponseDto(wallet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch virtual wallet for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch virtual wallet');
    }
  }

  async updateVirtualWallet(
    userId: number,
    updateData: UpdateVirtualWalletDto,
  ): Promise<VirtualWalletResponseDto> {
    try {
      const wallet = await this.virtualWalletRepository.findOne({
        where: {
          user_id: userId,
        },
      });

      if (!wallet) {
        throw new NotFoundException('Virtual wallet not found');
      }

      // Update wallet properties
      Object.assign(wallet, updateData);
      wallet.updated_at = new Date();

      const updatedWallet = await this.virtualWalletRepository.save(wallet);
      this.logger.log(
        `Virtual wallet updated successfully for user ID: ${userId}`,
      );

      return await this.mapToResponseDto(updatedWallet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update virtual wallet for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update virtual wallet');
    }
  }

  async processTransaction(
    userId: number,
    accountNumber: string,
    transactionData: VirtualWalletTransactionDto,
  ): Promise<VirtualWalletTransactionResponseDto> {
    this.logger.log(
      `Processing transaction for user ID: ${userId}, account: ${accountNumber}, type: ${transactionData.transaction_type}`,
    );

    try {
      // Use a Transaction to ensure Atomicity and Isolation
      return await this.virtualWalletRepository.manager.transaction(
        async (manager) => {
          // 1. Initial lookup to get ID (not locked yet)
          const initialWallet = await manager.findOne(VirtualWallet, {
            where: {
              user_id: userId,
              virtual_account_number: accountNumber,
            },
          });

          if (!initialWallet) {
            throw new NotFoundException('Virtual wallet not found');
          }

          // 2. Lock the specific wallet row for UPDATE
          // This prevents Race Conditions (Double Spend)
          const wallet = await manager.findOne(VirtualWallet, {
            where: { id: initialWallet.id },
            lock: { mode: 'pessimistic_write' }, // SELECT ... FOR UPDATE
          });

          if (wallet.status !== VirtualWalletStatus.ACTIVE) {
            throw new BadRequestException('Virtual wallet is not active');
          }

          // 3. Read Secure Balance (guaranteed to be consistent by lock and trigger)
          // We can trust current_balance because it's enforced by the DB trigger
          const balanceBefore = Number(wallet.current_balance);
          let balanceAfter = balanceBefore;

          // 4. Calculate impact and validate
          if (
            transactionData.transaction_type ===
            VirtualWalletTransactionType.CREDIT
          ) {
            balanceAfter = balanceBefore + transactionData.amount;
            // SAFE UPDATE: using increment to update total_credited
            // The DB Trigger will catch this update and automatically recalculate current_balance
            await manager.increment(
              VirtualWallet,
              { id: wallet.id },
              'total_credited',
              transactionData.amount,
            );
          } else if (
            transactionData.transaction_type ===
            VirtualWalletTransactionType.DEBIT
          ) {
            if (balanceBefore < transactionData.amount) {
              throw new BadRequestException('Insufficient balance');
            }
            balanceAfter = balanceBefore - transactionData.amount;
            // SAFE UPDATE: using increment to update total_debited
            // The DB Trigger will catch this update and automatically recalculate current_balance
            await manager.increment(
              VirtualWallet,
              { id: wallet.id },
              'total_debited',
              transactionData.amount,
            );
          }

          // 5. Create transaction record (Source of Truth)
          const transaction = manager.create(VirtualWalletTransaction, {
            virtual_wallet_id: wallet.id,
            user_id: userId,
            transaction_reference: transactionData.transaction_reference,
            external_reference: transactionData.external_reference,
            transaction_type: transactionData.transaction_type,
            amount: transactionData.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: transactionData.description,
            sender_name: transactionData.sender_name,
            sender_account: transactionData.sender_account,
            sender_bank_code: transactionData.sender_bank_code,
            receiver_name: transactionData.receiver_name,
            receiver_account: transactionData.receiver_account,
            receiver_bank_code: transactionData.receiver_bank_code,
            status: transactionData.status || TransactionStatus.SUCCESSFUL,
            response_code: transactionData.response_code || '00',
            response_message: transactionData.response_message,
            metadata: transactionData.metadata,
            processed_at: new Date(),
          });

          // 6. Save transaction
          const savedTransaction = await manager.save(transaction);

          // 7. Touch updated_at/last_transaction_date
          await manager.update(
            VirtualWallet,
            { id: wallet.id },
            { last_transaction_date: new Date() },
          );

          this.logger.log(
            `Transaction processed successfully: ${savedTransaction.transaction_reference}`,
          );
          return this.mapTransactionToResponseDto(savedTransaction);
        },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to process transaction for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to process transaction');
    }
  }

  async getWalletTransactions(
    userId: number,
    queryParams: GetWalletTransactionsDTO,
  ): Promise<{
    transactions: VirtualWalletTransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Fetching transactions for user ID: ${userId}`);

    try {
      const {
        page = 1,
        limit = 20,
        transaction_type,
        status,
        start_date,
        end_date,
        search,
      } = queryParams;

      const safePage = Number(page) > 0 ? Number(page) : 1;
      const safeLimit = Math.min(Number(limit) || 20, 100);
      const skip = (safePage - 1) * safeLimit;

      // Sanitize search to avoid SQL wildcard attacks
      const sanitizedSearch = search
        ? search.replace(/[%_]/g, '\\$&').toLowerCase()
        : null;

      const qb = this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.user_id = :userId', { userId });

      if (transaction_type) {
        qb.andWhere('transaction.transaction_type = :transaction_type', {
          transaction_type,
        });
      }

      if (status) {
        qb.andWhere('transaction.status = :status', { status });
      }

      if (start_date && end_date) {
        qb.andWhere(
          'transaction.created_at BETWEEN :start_date AND :end_date',
          {
            start_date,
            end_date,
          },
        );
      }

      if (queryParams.account_number) {
        const wallet = await this.virtualWalletRepository.findOne({
          where: {
            user_id: userId,
            virtual_account_number: queryParams.account_number,
          },
        });
        if (wallet) {
          qb.andWhere('transaction.virtual_wallet_id = :walletId', {
            walletId: wallet.id,
          });
        }
      }

      // 🔍 CASE-INSENSITIVE SEARCH (MySQL safe)
      if (sanitizedSearch) {
        qb.andWhere(
          `(
          LOWER(transaction.transaction_reference) LIKE :search
          OR LOWER(transaction.description) LIKE :search
          OR LOWER(transaction.sender_name) LIKE :search
          OR LOWER(transaction.receiver_name) LIKE :search
          OR CONCAT(transaction.amount, '') LIKE :search
        )`,
          { search: `%${sanitizedSearch}%` },
        );
      }

      qb.orderBy('transaction.created_at', 'DESC').skip(skip).take(safeLimit);

      const [transactions, total] = await qb.getManyAndCount();

      return {
        transactions: transactions.map((tx) =>
          this.mapTransactionToResponseDto(tx),
        ),
        total,
        page: safePage,
        limit: safeLimit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch transactions for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }

  async getWalletTransactionById(
    userId: number,
    transactionId: number,
  ): Promise<VirtualWalletTransactionResponseDto> {
    this.logger.log(
      `Fetching transaction ID: ${transactionId} for user ID: ${userId}`,
    );

    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId, user_id: userId },
      });

      if (!transaction) {
        throw new NotFoundException(
          `Transaction with ID ${transactionId} not found for user`,
        );
      }

      return this.mapTransactionToResponseDto(transaction);
    } catch (error) {
      this.logger.error(
        `Failed to fetch transaction ID: ${transactionId} for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch transaction');
    }
  }

  /**
   * 🔐 Securely calculate current balance from successful transactions
   * Formula: SUM(CREDITS) - SUM(DEBITS)
   */
  async calculateCurrentBalance(walletId: number): Promise<number> {
    const { balance } = await this.transactionRepository
      .createQueryBuilder('t')
      .select(
        'SUM(CASE WHEN t.transaction_type = :credit THEN t.amount WHEN t.transaction_type = :debit THEN -t.amount ELSE 0 END)',
        'balance',
      )
      .where('t.virtual_wallet_id = :walletId', { walletId })
      .andWhere('t.status = :status', { status: TransactionStatus.SUCCESSFUL })
      .setParameters({
        credit: VirtualWalletTransactionType.CREDIT,
        debit: VirtualWalletTransactionType.DEBIT,
      })
      .getRawOne();

    return Number(balance || 0);
  }

  private async mapToResponseDto(
    wallet: VirtualWallet,
  ): Promise<VirtualWalletResponseDto> {
    // Balance is now guaranteed by DB triggers, so we can use the stored value
    // This is O(1) instead of O(N)
    const currentBalance = Number(wallet.current_balance);

    return {
      id: wallet.id,
      user_id: wallet.user_id,
      virtual_account_number: wallet.virtual_account_number,
      virtual_account_name: wallet.virtual_account_name,
      bank_code: wallet.bank_code,
      amount_control: wallet.amount_control,
      current_balance: currentBalance,
      total_credited: wallet.total_credited,
      total_debited: wallet.total_debited,
      encrypted_infoware_customer_id: wallet.encrypted_infoware_customer_id,
      status: wallet.status,
      response_code: wallet.response_code,
      response_message: wallet.response_message,
      is_primary: wallet.is_primary,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };
  }

  private mapTransactionToResponseDto(
    transaction: VirtualWalletTransaction,
  ): VirtualWalletTransactionResponseDto {
    return {
      id: transaction.id,
      virtual_wallet_id: transaction.virtual_wallet_id,
      user_id: transaction.user_id,
      transaction_reference: transaction.transaction_reference,
      external_reference: transaction.external_reference,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      balance_before: transaction.balance_before,
      balance_after: transaction.balance_after,
      description: transaction.description,
      sender_name: transaction.sender_name,
      sender_account: transaction.sender_account,
      sender_bank_code: transaction.sender_bank_code,
      receiver_name: transaction.receiver_name,
      receiver_account: transaction.receiver_account,
      receiver_bank_code: transaction.receiver_bank_code,
      status: transaction.status,
      response_code: transaction.response_code,
      response_message: transaction.response_message,
      metadata: transaction.metadata,
      processed_at: transaction.processed_at,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    };
  }

  /**
   * Checks which virtual wallet providers (RMB / UBA) a user already has.
   * UBA is identified by bank_code '033'; all others are treated as RMB.
   */
  checkWalletProviders(wallets: Array<{ bank_code?: string }>): {
    hasRmbWallet: boolean;
    hasUbaWallet: boolean;
  } {
    const hasRmbWallet = wallets.some(
      (w) => w.bank_code && w.bank_code !== '033',
    );
    const hasUbaWallet = wallets.some((w) => w.bank_code === '033');
    return { hasRmbWallet, hasUbaWallet };
  }

  /**
   * 🛠️ Local DB Reset: Deletes all transaction records and the wallet record itself.
   * This operation bypasses internal protection triggers and does NOT notify the third party.
   */
  async localResetVirtualWallet(walletId: number): Promise<void> {
    this.logger.log(
      `[ADMIN] Performing local reset for virtual wallet ID: ${walletId}`,
    );

    const wallet = await this.virtualWalletRepository.findOne(walletId);
    if (!wallet) {
      throw new NotFoundException(
        `Virtual wallet with ID ${walletId} not found`,
      );
    }

    const runner =
      this.virtualWalletRepository.manager.connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      // 1. Temporarily drop the immutability triggers
      // We drop both Delete and Update triggers to ensure absolute clean wipe
      await runner.query(
        'DROP TRIGGER IF EXISTS protect_transaction_history_delete',
      );
      await runner.query(
        'DROP TRIGGER IF EXISTS protect_transaction_history_update',
      );

      // 2. Perform cascading deletion
      // Delete transactions first
      await runner.manager.delete(VirtualWalletTransaction, {
        virtual_wallet_id: walletId,
      });

      // Delete the wallet itself
      await runner.manager.delete(VirtualWallet, { id: walletId });

      await runner.commitTransaction();
      this.logger.log(
        `[ADMIN] Successfully wiped local records for wallet ID: ${walletId}`,
      );
    } catch (error) {
      await runner.rollbackTransaction();
      this.logger.error(
        `[ADMIN] Local reset failed for wallet ID: ${walletId}. Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Local reset failed: ${error.message}`,
      );
    } finally {
      // 3. MANDATORY: Restore the protection triggers immediately
      try {
        await runner.query(`
          CREATE TRIGGER IF NOT EXISTS protect_transaction_history_delete 
          BEFORE DELETE ON virtual_wallet_transaction 
          FOR EACH ROW 
          BEGIN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be deleted';
          END
        `);

        await runner.query(`
          CREATE TRIGGER IF NOT EXISTS protect_transaction_history_update 
          BEFORE DELETE ON virtual_wallet_transaction 
          FOR EACH ROW 
          BEGIN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be deleted';
          END
        `);
      } catch (triggerError) {
        this.logger.error(
          `[CRITICAL] Failed to restore protection triggers: ${triggerError.message}`,
        );
      }
      await runner.release();
    }
  }
}
