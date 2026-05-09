import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OwnerDocsService } from '../owner-docs/owner-docs.service';
import { ExternalApiCallsService } from '../../common/external-api-calls/external-api-calls.service';
import { EnvService } from '../../common/env.service';
import { CreateVirtualAccountResponseDto } from './dto/create-virtual-account.dto';
import { VirtualWalletService } from './virtual-wallet.service';
import {
  VirtualWalletResponseDto,
  VirtualWalletTransactionResponseDto,
} from './dto/virtual-wallet.dto';
import { OwnerDocsVerificationStatus } from '../owner-docs/entities/owner-doc.entity';
import { UserService } from '../user/user.service';
import { WalletsService } from 'src/sidecars/wallets/wallets.service';
import { NubanAccountsService } from 'src/sidecars/nuban-accounts/nuban-accounts.service';
import {
  TransactionStatus,
  VirtualWalletTransaction,
} from './entities/virtual-wallet-transaction.entity';
import {
  VirtualWallet,
  VirtualWalletStatus,
  VirtualWalletTransactionType,
} from './entities/virtual-wallet.entity';

@Injectable()
export class VirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);
  private readonly accountBaseUrl: string;
  private readonly symplusBaseUrl: string;

  constructor(
    private readonly ownerDocsService: OwnerDocsService,
    private readonly userService: UserService,
    private readonly walletsService: WalletsService,
    private readonly envService: EnvService,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly nubanAccountsService: NubanAccountsService,
    private readonly externalApiCallsService: ExternalApiCallsService,

    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,

    @InjectRepository(VirtualWalletTransaction)
    private readonly transactionRepository: Repository<VirtualWalletTransaction>,
  ) {
    this.accountBaseUrl = this.envService.read().ACCT_BASE_URL;
    this.symplusBaseUrl = this.envService.read().SYMPLUS_SERVICE_BASE_URL;

    this.logger.log(
      `Initialized VirtualAccountService with account base URL: ${this.accountBaseUrl}`,
    );
  }

  async createVirtualAccount(userId: number): Promise<{
    virtualAccount: CreateVirtualAccountResponseDto | null;
    virtualWallet: VirtualWalletResponseDto;
  }> {
    console.log(
      `Starting virtual account creation process for user ID: ${userId}`,
    );
    let rmbResponse: any = null;

    try {
      const user = await this.userService.findUserById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const wallet = await this.walletsService.fetchWallet({
        user_id: userId,
        wallet_ref: user.user_txn_ref,
      });

      const fetchUserNuban =
        await this.nubanAccountsService.fetchUserNubanWitheDetails(userId);

      // STEP 1: Check what wallets the user already has (RMB and UBA independently)
      const existingVirtualWallets =
        await this.virtualWalletService.getUserVirtualWallets(userId);

      // Delegate to shared provider check — single source of truth
      const { hasRmbWallet, hasUbaWallet } =
        this.virtualWalletService.checkWalletProviders(existingVirtualWallets);

      this.logger.log(
        `[VirtualAccount] User ${userId} - hasRmbWallet: ${hasRmbWallet}, hasUbaWallet: ${hasUbaWallet}`,
      );

      const rmbPayload = this.createVirtualAccountPayload(user);

      // STEP 2: Create RMB wallet if it doesn't exist
      if (!hasRmbWallet) {
        const rmbUrl = `${this.accountBaseUrl}/rmb/create-virtual-account`;
        this.logger.log(`Sending request to RMB API: ${rmbUrl}`);

        rmbResponse = await this.externalApiCallsService.postData(
          rmbUrl,
          rmbPayload,
        );

        this.logger.log(
          `Received response from RMB API:`,
          JSON.stringify(rmbResponse, null, 2),
        );
      } else {
        this.logger.log(
          `[VirtualAccount] RMB wallet already exists for user ${userId}, skipping RMB creation.`,
        );
      }

      // STEP 2.1: Create UBA wallet independently if it doesn't exist
      if (!hasUbaWallet) {
        const ubaUrl = `${this.accountBaseUrl}/uba/create-virtual-account`;
        try {
          this.logger.log(`Sending request to UBA API: ${ubaUrl}`);

          // UBA requires BVN and customer reference
          const ubaPayload = {
            ...rmbPayload,
            bvn: wallet?.bvn || user.nin, // Fallback to NIN if BVN is missing
            customerReference: user.user_txn_ref,
            firstname: user.first_name,
            lastname: user.last_name,
          };

          const ubaResponse = await this.externalApiCallsService.postData(
            ubaUrl,
            ubaPayload,
          );

          // Log the FULL response so we can see the exact field names from UBA
          this.logger.log(
            `[UBA_RAW] Full response: ${JSON.stringify(ubaResponse, null, 2)}`,
          );
          this.logger.log(
            `[UBA_RAW] data keys: ${
              ubaResponse?.data
                ? Object.keys(ubaResponse.data).join(', ')
                : 'no data field'
            }`,
          );

          // Extract account number — UBA uses vNUBAN nested in provider_response
          const ubaData = ubaResponse?.data;
          const ubaAccountNumber =
            ubaData?.data?.provider_response?.virtualAccount?.vNUBAN ||
            ubaData?.accountNumber ||
            ubaData?.accountno ||
            ubaData?.account_number ||
            ubaData?.virtualAccountNumber ||
            ubaData?.virtual_account_number ||
            ubaData?.AccountNumber;

          this.logger.log(
            `[UBA_RAW] Resolved account number: ${ubaAccountNumber}`,
          );

          // If UBA succeeded and we have an account number, create the wallet record
          if (ubaResponse?.success && ubaAccountNumber) {
            await this.virtualWalletService.createVirtualWallet(
              userId,
              wallet,
              fetchUserNuban,
              { ...ubaData, accountNumber: ubaAccountNumber }, // normalise field name
            );
            this.logger.log(
              `[VirtualAccount] UBA wallet record created for user ${userId}, account: ${ubaAccountNumber}`,
            );
          } else {
            this.logger.warn(
              `[VirtualAccount] UBA response received but no account number found. success=${
                ubaResponse?.success
              }, data=${JSON.stringify(ubaData)}`,
            );
          }
        } catch (ubaError) {
          this.logger.error(
            `[VirtualAccount] UBA account creation failed for user ${userId}: ${ubaError.message}`,
          );
          // Partially succeed — don't block RMB wallet creation
        }
      } else {
        this.logger.log(
          `[VirtualAccount] UBA wallet already exists for user ${userId}, skipping UBA creation.`,
        );
      }

      // STEP 3: Create/return the RMB virtual wallet record
      let virtualWallet;
      if (!hasRmbWallet && rmbResponse) {
        this.logger.log(`Creating RMB virtual wallet for user ID: ${userId}`);
        virtualWallet = await this.virtualWalletService.createVirtualWallet(
          userId,
          wallet,
          fetchUserNuban,
          rmbResponse,
        );
      } else {
        this.logger.log(
          `Returning existing RMB virtual wallet for user ID: ${userId}`,
        );
        virtualWallet =
          existingVirtualWallets?.find(
            (w) => w.bank_code && w.bank_code !== '033',
          ) || existingVirtualWallets?.[0];
      }

      return {
        virtualAccount: null,
        virtualWallet: virtualWallet,
      };
    } catch (error) {
      this.logger.error(
        `Virtual account creation failed for user ID: ${userId}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create virtual account: ${
          error.message || 'Unknown error occurred'
        }`,
      );
    }
  }

  async processVirtualAccountCreditCallback(
    payload: any,
  ): Promise<VirtualWalletTransactionResponseDto> {
    this.logger.log(
      `Received virtual account credit callback payload: ${JSON.stringify(
        payload,
        null,
        2,
      )}`,
    );

    const { paymentreference, sessionid } = payload;

    if (!paymentreference) {
      throw new BadRequestException(
        'Missing payment reference in callback payload',
      );
    }

    try {
      // ✅ Step 0: Confirm transaction with RubyPay
      // const confirmResponse = await axios.post(
      //   'https://00ocw7ymhj.execute-api.us-west-2.amazonaws.com/openapi/confirmcallbacktransaction',
      //   { paymentreference: payload?.sessionid },
      //   {
      //     headers: {
      //       Authorization: process.env.RMB_TOKEN || '',
      //       'Content-Type': 'application/json',
      //     },
      //   },
      // );

      // this.logger.log(
      //   `Confirmation API Response: Status=${confirmResponse.status}, Data=${JSON.stringify(
      //     confirmResponse.data,
      //   )}`,
      // );

      // if (
      //   confirmResponse.status !== 200 ||
      //   confirmResponse.data.responsecode !== '00'
      // ) {
      //   throw new BadRequestException(
      //     `Transaction confirmation failed for reference ${paymentreference}. Response: ${JSON.stringify(
      //       confirmResponse.data,
      //     )}`,
      //   );
      // }

      // const confirmedData = confirmResponse.data;

      const creditAmount = parseFloat(payload.amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        throw new BadRequestException('Invalid credit amount');
      }

      // ✅ Step 1: Prevent duplicate transactions
      const existingTransaction = await this.transactionRepository.findOne({
        where: { transaction_reference: payload.paymentreference },
      });

      if (existingTransaction) {
        this.logger.warn(
          `Duplicate callback transaction detected: ${payload.paymentreference}`,
        );
        throw new ConflictException('Duplicate transaction');
      }

      // ✅ Step 2: Find wallet by virtual account number to identify user
      const wallet = await this.virtualWalletRepository.findOne({
        where: { virtual_account_number: payload.craccount },
      });

      console.log(
        'wallet found for callback',
        wallet ? wallet.virtual_account_number : 'null',
      );

      if (!wallet) {
        throw new NotFoundException(
          `No wallet found for virtual account number: ${payload.virtualaccount}`,
        );
      }

      if (wallet.status !== VirtualWalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      // ✅ Step 3: Delegate to Safe Transaction Service
      // This ensures Atomic Transaction + Pessimistic Locking + Trigger Compliance
      const transactionDto: any = {
        transaction_reference: payload.paymentreference,
        external_reference: payload.sessionid,
        transaction_type: VirtualWalletTransactionType.CREDIT,
        amount: creditAmount,
        description: payload.narration || 'Virtual Account Credit',
        sender_name: payload.originatorname,
        sender_account: payload.originatoraccountnumber,
        sender_bank_code: payload.bankcode,
        receiver_name: payload.virtualaccountname,
        receiver_account: payload.virtualaccount,
        receiver_bank_code: wallet.bank_code,
        status: TransactionStatus.SUCCESSFUL, // We confirm success here logic-wise
        response_code: '00',
        response_message: 'Credit processed successfully',
        metadata: JSON.stringify(payload),
      };

      const processedTransaction =
        await this.virtualWalletService.processTransaction(
          wallet.user_id,
          wallet.virtual_account_number,
          transactionDto,
        );

      this.logger.log(
        `✅ Wallet credited successfully via Safe Service. User ID: ${wallet.user_id}, Amount: ₦${creditAmount}, TxnRef: ${payload.paymentreference}`,
      );

      return processedTransaction;
    } catch (error) {
      this.logger.error(
        `Failed to process callback for payment reference ${paymentreference}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error processing virtual account callback: ${error.message}`,
      );
    }
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

  private async checkUserDocumentApproval(userId: number): Promise<boolean> {
    this.logger.log(`Checking document approval for user ID: ${userId}`);

    try {
      const userDocs = await this.ownerDocsService.findExisting(userId);

      if (!userDocs) {
        this.logger.warn(`No documents found for user ID: ${userId}`);
        return false;
      }

      return (
        userDocs.owner_docs_verification_status ===
        OwnerDocsVerificationStatus.VERIFIED
      );
    } catch (error) {
      this.logger.error(
        `Error checking document approval for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to verify document approval',
      );
    }
  }

  private createFundAccountPayload(
    user: any,
    fetchUserNuban: any,
    wallet: any,
  ): any {
    this.logger.log(`Creating Fund Account payload for user: ${user.email}`);

    return {
      create: [
        {
          customer: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          fund: 'DEFAULT_FUND', // TODO: replace with actual fund code
          account: fetchUserNuban?.nuban_account || wallet.wallet_ref,
          accountname: `${user.first_name || ''} ${
            user.last_name || ''
          }`.trim(),
          registrar: 'DEFAULT_REGISTRAR',
          externalref: user.user_txn_ref || wallet.wallet_ref,
          reinvest: 'YES',
          reinvestpct: 100,
        },
      ],
    };
  }

  private createVirtualAccountPayload(user: any): any {
    this.logger.log(`Creating Virtual Account payload for user: ${user.email}`);
    const baseUrl = this.envService.read().USER_BASE_URL;
    const bankCode = this.envService.read().DEFAULT_BANK_CODE;

    return {
      virtualaccountname: `${user.first_name || ''} ${
        user.last_name || ''
      }`.trim(),
      amountcontrol: 'VARIABLEAMOUNT',
      email: user.email,
      mobilenumber: `+234${user.phone}`,
      settlementaccount: '1000193089',
      settlementaccountname: 'UNITED CAP GDL CANARY BAL FUND INV',
      amount: '1',
      daysactive: '60000',
      minutesactive: '60000',
      bankcode: '000024',
      callbackurl: `${baseUrl}/virtual-account/callback`,
      extradata: `${user.id}`,
    };
  }
}
