import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, Connection, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  MMFInvestmentRequest,
  MMFInvestmentRequestStatus,
} from './entities/investment-request.entity';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { VirtualWalletService } from '../virtual-account/virtual-wallet.service';
import { VirtualWalletTransactionType } from '../virtual-account/entities/virtual-wallet.entity';
import { ExternalApiCallsService } from '../../common/external-api-calls/external-api-calls.service';
import { SymplusService } from '../virtual-account/symplus.service';
import {
  CanaryInvestmentRequest,
  CanaryInvestmentRequestStatus,
} from '../investment-request-canary/entities/investment-request-canary.entity';
import {
  IncomeInvestmentRequest,
  IncomeInvestmentRequestStatus,
} from '../investment-request-income/entities/investment-request-income.entity';
import { randomBytes, randomInt, randomUUID } from 'crypto';
import { investment_request_html } from 'src/common/utils/notification-templates/investment-request-helper';
import { AuthRequestType } from '../auth/entities/auth.entity';

import {
  CreateInvestmentRequestDto,
  InvestmentRequestResponseDto,
  ApproveInvestmentRequestDto,
  RejectInvestmentRequestDto,
  UpdateInvestmentRequestDto,
  GetInvestmentRequestsDto,
  CreateFundRedemptionDto,
  FundRedemptionResponseDto,
  FundRedemptionAdminResponseDto,
  FundRedemptionDto,
  FundRedemptionItemDto,
  GetRedemptionRequestsDto,
} from './dto/investment-request.dto';
import { UserService } from '../user/user.service';
import { NubanAccountsService } from 'src/sidecars/nuban-accounts/nuban-accounts.service';
import {
  FundRedemptionMMFRequest,
  FundRedemptionMMFStatus,
} from './entities/redemption-request.entity';
import {
  InvestmentPoolStatus,
  InvestmentPoolType,
} from '../investment-pull/entities/investment-pull.entity';

@Injectable()
export class InvestmentRequestService {
  private readonly logger = new Logger(InvestmentRequestService.name);
  private readonly symplusBaseUrl: string;
  private readonly symplusFundAccountUrl: string;

  constructor(
    @InjectRepository(MMFInvestmentRequest)
    public readonly investmentRequestRepository: Repository<MMFInvestmentRequest>,
    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,
    @InjectRepository(FundRedemptionMMFRequest)
    private readonly fundRedemptionRepository: Repository<FundRedemptionMMFRequest>,
    @InjectRepository(CanaryInvestmentRequest)
    private readonly canaryRequestRepository: Repository<CanaryInvestmentRequest>,
    @InjectRepository(IncomeInvestmentRequest)
    private readonly incomeRequestRepository: Repository<IncomeInvestmentRequest>,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly symplusService: SymplusService,
    private readonly nubanAccountsService: NubanAccountsService,
    private readonly dataSource: Connection, // ✅ FIX: Inject DataSource for transactions
  ) {
    this.symplusBaseUrl = this.configService.get<string>(
      'SYMPLUS_SERVICE_BASE_URL',
    );
    this.symplusFundAccountUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-account`;
    this.logger.log(
      `Initialized InvestmentRequestService with Symplus Base URL: ${this.symplusBaseUrl} `,
    );
  }

  /**
   * Fetch fund accounts for the authenticated user from Symplus using their encrypted customer ID.
   */
  async getUserFundAccounts(userId: number): Promise<any> {
    this.logger.log(`Fetching Symplus fund accounts for user ID: ${userId}`);

    try {
      // Get user's virtual wallet to access encrypted Symplus customer ID
      let userWallet = await this.virtualWalletService.findWalletForInvestment(
        userId,
        InvestmentPoolType.MMF,
      );

      if (!userWallet) {
        throw new NotFoundException('User virtual wallet not found');
      }

      // Step 1: Ensure Symplus Customer ID exists
      userWallet = await this.ensureSymplusCustomerExists(userId, userWallet);

      // Step 2: Ensure Fund Accounts exist
      await this.ensureFundAccountsExist(userId, userWallet);

      // Step 3: Fetch Fund Accounts
      const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${userWallet.encrypted_symplus_customer_id}`;
      this.logger.log(`Fetching fund accounts from: ${url}`);

      const response = await this.externalApiCallsService.getData(url);

      this.logger.log(
        `Symplus fund accounts response for user ${userId}: ${JSON.stringify(
          response,
          null,
          2,
        )}`,
      );

      if (!response || response.error || response.statusCode >= 400) {
        throw new InternalServerErrorException(
          response?.message || 'Failed to fetch fund accounts from Symplus',
        );
      }

      return response;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch fund accounts for user ID ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch fund accounts');
    }
  }

  private async ensureSymplusCustomerExists(
    userId: number,
    userWallet: VirtualWallet,
  ): Promise<VirtualWallet> {
    if (userWallet.encrypted_symplus_customer_id) {
      return userWallet;
    }

    console.log(
      `Symplus customer ID not found locally for user ${userId}. Checking remote existence...`,
    );

    const user = await this.userService.findUserById(userId);
    const fetchUserNuban =
      await this.nubanAccountsService.fetchUserNubanWitheDetails(userId);

    // ------------------------------------------------------------------
    // REMOTE PRE-CHECK: Check if customer exists on Symplus remotely
    // ------------------------------------------------------------------
    await this.symplusService.createSymplusCustomer(
      userId,
      userWallet.id,
      userWallet,
      fetchUserNuban,
    );

    // Reload wallet to get the newly saved encrypted ID
    const reloadedWallet =
      await this.virtualWalletService.findWalletForInvestment(
        userId,
        InvestmentPoolType.MMF,
      );

    if (!reloadedWallet?.encrypted_symplus_customer_id) {
      throw new InternalServerErrorException(
        'Failed to auto-create and save Symplus ID',
      );
    }

    return reloadedWallet;
  }

  private async ensureFundAccountsExist(
    userId: number,
    userWallet: VirtualWallet,
  ): Promise<void> {
    // Check if we already have the account numbers locally
    if (
      !userWallet.encrypted_symplus_customer_id ||
      (userWallet.FundAccountNo && userWallet.CashAccountNo)
    ) {
      return;
    }

    try {
      // 1. First: Check if accounts already exist on Symplus
      const fetchUrl = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${userWallet.encrypted_symplus_customer_id}`;
      const existingAccountsResponse =
        await this.externalApiCallsService.getData(fetchUrl);

      if (
        existingAccountsResponse?.data?.GetFundAccounts &&
        Array.isArray(existingAccountsResponse.data.GetFundAccounts)
      ) {
        const accounts = existingAccountsResponse.data.GetFundAccounts;
        // Use default fund from config or fallback
        const defaultFund =
          this.configService.get<string>('DEFAULT_FUND') || 'DEFAULT_FUND';

        // Look for an account matching the default fund
        const existingFundAccount = accounts.find(
          (acc: any) => acc.FUND_ID === defaultFund,
        );

        if (existingFundAccount) {
          console.log(
            `Found existing Symplus fund account for user ${userId}: ${existingFundAccount.ACCOUNT_NO}. Updating wallet.`,
          );

          userWallet.FundAccountNo = existingFundAccount.ACCOUNT_NO;
          // Note: If CashAccountNo is not explicitly linked in this list, we might leave it.
          // But generally, finding the Fund Account implies readiness.

          await this.virtualWalletRepository.save(userWallet);

          // Return early if we found what we needed
          return;
        }
      }

      // 2. If not found, proceed to creation
      const user = await this.userService.findUserById(userId);
      const fetchUserNuban =
        await this.nubanAccountsService.fetchUserNubanWitheDetails(userId);
      const saved = { reference: `${Date.now()}-${user.id}` };

      const fundAccountPayload = this.createFundAccountPayload(
        user,
        saved,
        fetchUserNuban,
        userWallet.encrypted_symplus_customer_id,
      );

      this.logger.log(
        `Initiating auto-fund-account request for user ${userId} / ref ${saved.reference}`,
      );

      // Fire and forget (awaiting here but catching error so it doesn't block return)
      const fundResponse: any = await this.externalApiCallsService.postData(
        this.symplusFundAccountUrl,
        fundAccountPayload,
      );

      this.logger.log(
        `Symplus fund-account response for user ${userId}: ${JSON.stringify(
          fundResponse,
        )}`,
      );

      if (fundResponse?.data?.reference) {
        const { FundAccountNo, CashAccountNo } = fundResponse.data.reference;

        if (FundAccountNo && CashAccountNo) {
          userWallet.FundAccountNo = FundAccountNo;
          userWallet.CashAccountNo = CashAccountNo;
          await this.virtualWalletRepository.save(userWallet);
          this.logger.log(
            `Updated wallet for user ${userId} with FundAccountNo: ${FundAccountNo} and CashAccountNo: ${CashAccountNo}`,
          );
        } else {
          this.logger.warn(
            `FundAccountNo or CashAccountNo missing in Symplus response for user ${userId}`,
          );
        }
      } else {
        this.logger.warn(
          `Invalid Symplus response structure for user ${userId}, 'reference' field missing.`,
        );
      }
    } catch (e) {
      this.logger.warn(`Auto fund account creation failed: ${e.message}`);
    }
  }

  /**
   * (Legacy) Fetch fund accounts for a given customer from Symplus.
   * Kept for backward compatibility.
   */
  async getCustomerFundAccounts(customerId: string): Promise<any> {
    this.logger.log(
      `Fetching Symplus fund accounts for customer: ${customerId} `,
    );

    try {
      const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${customerId}`;
      const response = await this.externalApiCallsService.getData(url);

      this.logger.log(
        `Symplus fund accounts response for ${customerId}: ${JSON.stringify(
          response,
          null,
          2,
        )} `,
      );

      if (!response || response.error || response.statusCode >= 400) {
        throw new Error(
          response?.message || 'Failed to fetch fund accounts from Symplus',
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch fund accounts for customer ${customerId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch fund accounts');
    }
  }

  async createInvestmentRequest(
    userId: number,
    createInvestmentRequestDto: CreateInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    console.log(`Creating investment request for user ID: ${userId} `);
    console.log(
      `Investment request data: ${JSON.stringify(
        createInvestmentRequestDto,
        null,
        2,
      )} `,
    );
    const referenceId = `GDL - ${Date.now()}${userId} `;
    try {
      // Ensure unique reference
      const existing = await this.investmentRequestRepository.findOne({
        where: { reference: referenceId },
      });
      if (existing) {
        this.logger.warn(
          `Investment request with reference ${referenceId} already exists`,
        );
        throw new BadRequestException(
          'Investment request with this reference already exists',
        );
      }

      const user = await this.userService.findUserById(userId);
      const price = Number(createInvestmentRequestDto.price);
      const amount = price;
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException(
          'Invalid price or quantity resulting in non-positive amount',
        );
      }

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // validate balances against computed amount
      console.log(
        `[DEBUG MMF] Validating balance for user ${userId}: amount=${amount}`,
      );
      await this.validateUserBalance(userId, amount);
      console.log(`[DEBUG MMF] Balance validation passed for user ${userId}`);

      const fetchUserNuban =
        await this.nubanAccountsService.fetchUserNubanWitheDetails(user.id);
      const calculatedQuantity = Number(createInvestmentRequestDto.price) / 10;
      // persist request (entity stores price & quantity; amount is computed on the fly)

      // ------------------------------------------------------------------
      // AUTO-CREATE SYMPLUS ID AND FUND ACCOUNT (Non-blocking)
      // ------------------------------------------------------------------
      try {
        let userWallet =
          await this.virtualWalletService.findWalletForInvestment(
            userId,
            InvestmentPoolType.MMF,
          );

        if (userWallet) {
          // Step 1: Ensure Symplus Customer ID exists
          userWallet = await this.ensureSymplusCustomerExists(
            userId,
            userWallet,
          );

          // Step 2: Ensure Fund Accounts exist (checks Symplus first)
          await this.ensureFundAccountsExist(userId, userWallet);
        } else {
          this.logger.warn(
            `User wallet not found for user ${userId}, skipping auto-creation checks.`,
          );
        }
      } catch (autoCreateError) {
        this.logger.warn(
          `Auto-creation of Symplus data failed during investment request: ${autoCreateError.message}`,
        );
        // We do not throw here to allow the investment request to complete locally
      }

      const request = this.investmentRequestRepository.create({
        user_id: userId,
        first_name: user.first_name,
        last_name: user.last_name,
        account: fetchUserNuban?.nuban_account || 'Test Account',
        date: new Date(Date.now()),
        price: createInvestmentRequestDto.price,
        quantity: calculatedQuantity,
        reference: referenceId,
        status: MMFInvestmentRequestStatus.PENDING,
      });

      const saved = await this.investmentRequestRepository.save(request);
      this.logger.log(
        `Investment request created successfully with ID: ${saved.id}`,
      );

      // Send email notification
      try {
        const emailData = {
          heading: 'Investment Request Received – Pending Approval',
          userName: `${user.first_name} ${user.last_name}`,
          introText:
            'Thank you for submitting your investment request on GDL Plus. Your request has been received and is currently pending internal approval. You’ll be notified once the process is completed.',
          details: [
            { label: 'Investment Type', value: 'MMF Funds' },
            { label: 'Units Purchased', value: `${saved.quantity}` },
            { label: 'Price per Unit', value: '₦10.00' },
            {
              label: 'Total Amount',
              value: `₦${Number(saved.price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            { label: 'Reference Number', value: saved.reference },
          ],
          closingText:
            'No further action is required at this time. Please keep the reference number for your records.',
          supportText:
            'For any questions, contact our support team at support@housemoni.ng',
          type: AuthRequestType.SUBSCRIPTION_CONFIRMATION,
        };

        const html = investment_request_html(emailData);

        const notificationData = {
          sender: 'GDL',
          title: 'Investment Request Received – Pending Approval',
          description:
            'Your investment request has been received and is awaiting approval.',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: user.email,
          recipients_phone_number: user.phone || 'null',
          request_ref: `INV_${saved.reference}${Date.now()}`,
          message: `Your investment request for MMF Funds (Ref: ${saved.reference}) has been received.`,
          html: null,
          complete_html_body: html,
          show_advert: false,
          purpose: 'register',
        };

        await this.userService.sendUserAuthNotifications(notificationData);
        this.logger.log(`Investment request email sent to ${user.email}`);
      } catch (emailError) {
        this.logger.error(
          `Failed to send investment request email: ${emailError.message}`,
          emailError.stack,
        );
      }

      // ------------------------------------------------------------------
      // INTERNAL STAFF NOTIFICATION (MMF Investment)
      // ------------------------------------------------------------------
      try {
        const userWallet =
          await this.virtualWalletService.findWalletForInvestment(
            userId,
            InvestmentPoolType.MMF,
          );

        // Decrypt Symplus ID if available
        let symplusId = 'Not Available';
        if (userWallet?.encrypted_symplus_customer_id) {
          try {
            symplusId = await this.symplusService.getDecryptedCustomerId(
              userWallet.id,
            );
          } catch (e) {
            this.logger.warn(
              `Failed to decrypt Symplus ID for internal email: ${e.message}`,
            );
          }
        }

        const internalEmailData = {
          heading: 'New MMF Investment Request - Action Required',
          userName: 'Admin',
          introText: `A new MMF investment request has been submitted by <b>${user.first_name} ${user.last_name}</b> and requires your attention.`,
          details: [
            {
              label: 'Customer Name',
              value: `${user.first_name} ${user.last_name}`,
            },
            { label: 'Symplus ID', value: symplusId },
            { label: 'Investment Type', value: 'MMF Funds' },
            {
              label: 'Amount',
              value: `₦${Number(saved.price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            { label: 'Reference', value: saved.reference },
            { label: 'Date', value: new Date().toLocaleString() },
          ],
          closingText:
            'Please review and process this request on the admin dashboard.',
          supportText: '',
          signOff: 'System Notification',
        };

        const internalHtml = investment_request_html(internalEmailData);

        const internalNotificationData = {
          sender: 'GDL System',
          title: 'New MMF Investment Request',
          description: 'New MMF Investment Request',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id, // Notification service might require a user ID, using user's ID but overriding email
          recipients_email: 'yadekoya@housemoni.ng',
          recipients_phone_number: 'null',
          request_ref: `INT_INV_${saved.reference}${Date.now()}`,
          message: `New MMF Investment Request from ${user.first_name} ${user.last_name}`,
          html: null,
          complete_html_body: internalHtml,
          show_advert: false,
          purpose: 'register',
          cc: 'aanurunkem@housemoni.ng', // Assuming notification service supports CC in payload or we append to email
        };

        // If the service doesn't support CC field directly, we might need to rely on the service implementation or send twice.
        // Based on typical implementations, let's try sending to primary first.
        await this.userService.sendUserAuthNotifications(
          internalNotificationData,
        );

        // Explicitly send CC if needed (or if the above doesn't handle CC) using a separate call if we want to be sure,
        // but let's assume one call to primary is the main requirement.
        // However, the user asked to "put aanurunkem@housemoni.ng in copy".
        // Use a safe approach: Send a second notification to the copy address if the first one doesn't support CC via prop.
        // Since I can't verify the notification service code, I will send a second email to the CC address to ensure delivery.

        const ccNotificationData = {
          ...internalNotificationData,
          recipients_email: 'aanurunkem@housemoni.ng',
          cc: undefined,
        };
        await this.userService.sendUserAuthNotifications(ccNotificationData);

        this.logger.log(`Internal investment notification sent to staff`);
      } catch (internalEmailError) {
        this.logger.error(
          `Failed to send internal investment notification: ${internalEmailError.message}`,
          internalEmailError.stack,
        );
      }

      return this.mapToResponseDto(saved);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotAcceptableException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create investment request for user ID: ${userId} `,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to create investment request',
      );
    }
  }

  async getUserInvestmentRequests(
    userId: number,
    queryParams: GetInvestmentRequestsDto,
  ): Promise<{
    requests: InvestmentRequestResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Fetching investment requests for user ID: ${userId} `);

    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        search,
      } = queryParams;
      const skip = (page - 1) * limit;

      /**
       * 🚨 OSWAP Security: Input Normalization & Sanitization
       * - Convert search to lowercase
       * - Trim whitespace
       * - Strip dangerous characters (SQL wildcard injection)
       */
      const cleanedSearch = search
        ? search.toString().trim().toLowerCase().replace(/[%_]/g, '')
        : null;

      const qb = this.investmentRequestRepository
        .createQueryBuilder('req')
        .where('req.user_id = :userId', { userId });

      /** STATUS FILTER (SAFE) */
      if (status) {
        qb.andWhere('req.status = :status', { status });
      }

      /** DATE RANGE FILTER (SAFE) */
      if (start_date && end_date) {
        qb.andWhere('req.created_at BETWEEN :start AND :end', {
          start: new Date(start_date),
          end: new Date(end_date),
        });
      }

      /**
       * 🔎 SECURE SEARCH FILTER
       * - Only searches whitelisted fields
       * - No dynamic SQL
       * - Case-insensitive
       * - Sanitized search value
       */
      if (cleanedSearch) {
        qb.andWhere(
          `(LOWER(req.first_name) LIKE :search
          OR LOWER(req.last_name) LIKE :search
          OR LOWER(req.account) LIKE :search
          OR LOWER(req.reference) LIKE :search
          OR CONCAT(req.price, '') LIKE :search
          OR CONCAT(req.quantity, '') LIKE :search)`,
          { search: `%${cleanedSearch}%` },
        );
      }

      /** ORDER + PAGINATION */
      qb.orderBy('req.created_at', 'DESC').skip(skip).take(limit);

      const [requests, total] = await qb.getManyAndCount();

      return {
        requests: requests.map((r) => this.mapToResponseDto(r)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch investment requests for user ${userId}`,
        error.stack,
      );

      if (error instanceof BadRequestException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Unable to fetch investment requests at the moment',
      );
    }
  }

  async getInvestmentRequestById(
    userId: number,
    requestId: number,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Fetching investment request ID: ${requestId} for user ID: ${userId} `,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });

      console.log('request', request);

      if (!request) {
        this.logger.warn(
          `Investment request ID: ${requestId} not found for user ID: ${userId} `,
        );
        throw new NotFoundException('Investment request not found');
      }

      // Check for missing subscription
      const userIdRetrieved = request.user_id;
      console.log('userIdRetrieved', userIdRetrieved);
      try {
        const user = await this.userService.findUserById(userIdRetrieved);
        console.log('user', user);

        if (user && request.status === MMFInvestmentRequestStatus.APPROVED) {
          await this.retryFundSubscriptionIfMissing(user, request);
        }
      } catch (retryError) {
        console.log(
          `Auto-retry subscription check failed: ${retryError.message}`,
        );
      }

      return this.mapToResponseDto(request);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to fetch investment request ID: ${requestId} `,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch investment request',
      );
    }
  }

  async getUserTotalActiveInvestmentAmount(userId: number): Promise<any> {
    this.logger.log(
      `[FETCH_TOTAL_ACTIVE] Fetching active investment for user: ${userId} `,
    );

    try {
      // Step 1: Get user's wallet to access encrypted Symplus customer ID
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.MMF,
        );

      if (!userWallet) {
        throw new NotFoundException('User virtual wallet not found');
      }

      if (!userWallet.encrypted_symplus_customer_id) {
        throw new BadRequestException(
          'Symplus customer ID not found. Please ensure your account is fully set up.',
        );
      }

      // Step 2: Fetch MMF pool investments from Symplus API
      const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${userWallet.encrypted_symplus_customer_id}`;
      this.logger.log(`Fetching active investments from: ${url} `);

      const response = await this.externalApiCallsService.getData(url);

      if (!response || response.error || response.statusCode >= 400) {
        throw new InternalServerErrorException(
          response?.message ||
            'Failed to fetch active investments from Symplus',
        );
      }

      // Extraction based on the provided JSON structure: response.data.GetFundAccounts
      const list = response?.data?.GetFundAccounts || [];

      // Step 3: If no investment found, return safe default
      if (!list.length) {
        this.logger.warn(
          `[NO_INVESTMENT] No active MMF investments for user: ${userId} `,
        );
        return {
          user_id: userId,
          type: InvestmentPoolType.MMF,
          status: 'NO_ACTIVE_INVESTMENT',
          investment: null,
        };
      }

      // Step 4: Pick the first investment from the list
      const best = list[0];

      // Step 5: Build refined response mapping Symplus fields to standardized fields
      const refined = {
        user_id: userId,
        type: InvestmentPoolType.MMF,
        status: 'ACTIVE',
        investment: {
          date: best.BALANCE_DATE,
          fund_name: best.FUND_DESCRIPTION,
          units: best.BALANCE_QUANTITY,
          principal: best.COST_VALUE,
          market_price: best.CURRENT_BID_PRICE,
          market_value: best.CURRENT_VALUE,
          accrued_interest: best.OUTSTANDING_ACCRUED_INTEREST,
          accrued_interest_percent: 0, // Not explicitly provided in the GetFundAccounts item
        },
      };

      return refined;
    } catch (error) {
      this.logger.error(
        `[FETCH_TOTAL_ACTIVE_ERROR] User: ${userId} | ${error.message} `,
        error.stack,
      );
      return {
        user_id: userId,
        type: InvestmentPoolType.MMF,
        status: 'ERROR',
        investment: null,
      };
    }
  }

  async updateInvestmentRequest(
    userId: number,
    requestId: number,
    updateData: UpdateInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Updating investment request ID: ${requestId} for user ID: ${userId} `,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId, user_id: userId },
      });

      if (!request) throw new NotFoundException('Investment request not found');
      if (request.status !== MMFInvestmentRequestStatus.PENDING) {
        throw new BadRequestException(
          'Cannot update investment request that is not pending',
        );
      }

      // If price/quantity are updated, compute new amount and validate balance
      if (updateData.price || updateData.quantity) {
        const newPrice = updateData.price ?? Number(request.price);
        const newQuantity = updateData.quantity ?? Number(request.quantity);
        const newAmount = Number(newPrice) * Number(newQuantity);
        if (isNaN(newAmount) || newAmount <= 0) {
          throw new BadRequestException(
            'Invalid price or quantity resulting in non-positive amount',
          );
        }
        await this.validateUserBalance(userId, newAmount, requestId);
      }

      Object.assign(request, updateData);
      const updated = await this.investmentRequestRepository.save(request);

      this.logger.log(
        `Investment request ID: ${requestId} updated successfully`,
      );
      return this.mapToResponseDto(updated);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(
        `Failed to update investment request ID: ${requestId} `,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update investment request',
      );
    }
  }

  async getAllInvestmentRequests(
    queryParams: GetInvestmentRequestsDto,
  ): Promise<{
    requests: InvestmentRequestResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
      } = queryParams;
      const skip = (page - 1) * limit;

      const whereConditions: any = {};
      if (status) whereConditions.status = status;
      if (start_date && end_date) {
        whereConditions.created_at = Between(
          new Date(start_date),
          new Date(end_date),
        );
      }

      const [requests, total] =
        await this.investmentRequestRepository.findAndCount({
          where: whereConditions,
          relations: ['user'],
          order: { created_at: 'DESC' },
          skip,
          take: limit,
        });

      this.logger.log(`Admin found ${total} investment requests`);

      return {
        requests: requests.map((r) => this.mapToResponseDto(r)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to fetch investment requests`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch investment requests',
      );
    }
  }

  async approveInvestmentRequest(
    requestId: number,
    adminId: number,
    approveData: ApproveInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Admin ID: ${adminId} attempting to approve request ID: ${requestId} `,
    );

    try {
      // Step 1: Fetch investment request
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Investment request not found');

      if (request.status !== MMFInvestmentRequestStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be approved');
      }

      // Step 2: Fetch user and wallet
      const user = await this.userService.findUserById(request.user_id);
      if (!user) throw new BadRequestException('Associated user not found');

      const wallet = await this.virtualWalletService.findWalletForInvestment(
        user.id,
        InvestmentPoolType.MMF,
      );
      if (!wallet) throw new BadRequestException('User wallet not found');

      const amount = Number(request.price);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Invalid investment amount');
      }

      // Step 3: Validate user balance
      await this.validateUserBalance(user.id, amount, requestId);

      // Step 4: Mark request as processing
      request.status = MMFInvestmentRequestStatus.PROCESSING;
      request.approved_by = adminId;
      request.approved_at = new Date();
      request.admin_notes = (approveData.admin_notes || '').trim();
      await this.investmentRequestRepository.save(request);

      // Step 5: Debit wallet
      await this.debitUserWallet(
        user.id,
        amount,
        request.reference,
        InvestmentPoolType.MMF,
      );

      // ------------------------------------------------------------------
      // AUTO-CASH DEPOSIT REQUEST
      // ------------------------------------------------------------------
      try {
        if (wallet.CashAccountNo && wallet.encrypted_symplus_customer_id) {
          const cashDepositPayload = {
            deposit: [
              {
                customer: wallet.encrypted_symplus_customer_id,
                account: wallet.CashAccountNo,
                date: new Date().toISOString().split('T')[0],
                amount: request.price.toString(),
                description: 'MMF Investment Request',
                reference: request.reference,
                contra: '212935',
              },
            ],
          };

          const symplusCashDepositUrl = `${this.symplusBaseUrl}/symplus/api/requests/cash-deposit`;

          this.logger.log(
            `Initiating auto - cash - deposit request for user ${user.id} / ref ${request.reference} `,
          );

          const cashDepositResponse: any =
            await this.externalApiCallsService.postData(
              symplusCashDepositUrl,
              cashDepositPayload,
            );

          if (
            !cashDepositResponse ||
            cashDepositResponse.error ||
            (cashDepositResponse.statusCode &&
              cashDepositResponse.statusCode >= 400)
          ) {
            const errorMsg =
              cashDepositResponse?.message || 'Symplus cash deposit failed';
            throw new Error(errorMsg);
          }

          this.logger.log(
            `Successfully initiated cash - deposit request for user ${user.id}`,
          );
        } else {
          this.logger.warn(
            `Missing CashAccountNo or encrypted Symplus ID for user ${user.id}; skipping cash - deposit request.`,
          );
        }
      } catch (cashDepositError) {
        this.logger.error(
          `Failed to auto - create cash - deposit request for user ${user.id}: ${cashDepositError.message} `,
          cashDepositError.stack,
        );

        // Reverse debit and fail approval
        await this.creditUserWallet(
          user.id,
          amount,
          request.reference,
          InvestmentPoolType.MMF,
        );
        request.status = MMFInvestmentRequestStatus.PENDING;
        request.admin_notes = `[AUTO-REVERSED] Cash deposit failed: ${cashDepositError.message}`;
        await this.investmentRequestRepository.save(request);

        throw new InternalServerErrorException(
          `Sync failure: ${cashDepositError.message}. User wallet has been reversed.`,
        );
      }

      // ------------------------------------------------------------------
      // AUTO-FUND SUBSCRIPTION REQUEST
      // ------------------------------------------------------------------
      try {
        if (wallet.FundAccountNo) {
          const fundSubscriptionPayload = {
            subscription: [
              {
                fund:
                  this.configService.get<string>('DEFAULT_FUND') ||
                  'DEFAULT_FUND',
                account: wallet.FundAccountNo,
                date: new Date().toISOString().split('T')[0],
                price: 10,
                quantity: Number(request.quantity),
                reference: request.reference,
              },
            ],
          };

          const symplusFundSubscriptionUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-subscription`;

          this.logger.log(
            `Initiating auto - fund - subscription request for user ${user.id} / ref ${request.reference} `,
          );

          const fundSubscriptionResponse: any =
            await this.externalApiCallsService.postData(
              symplusFundSubscriptionUrl,
              fundSubscriptionPayload,
            );

          if (
            !fundSubscriptionResponse ||
            fundSubscriptionResponse.error ||
            (fundSubscriptionResponse.statusCode &&
              fundSubscriptionResponse.statusCode >= 400)
          ) {
            const errorMsg =
              fundSubscriptionResponse?.message ||
              'Symplus fund subscription failed';
            throw new Error(errorMsg);
          }

          this.logger.log(
            `Successfully initiated fund - subscription request for user ${user.id}`,
          );
        } else {
          this.logger.warn(
            `Missing FundAccountNo for user ${user.id}; skipping fund - subscription request.`,
          );
        }
      } catch (fundSubscriptionError) {
        this.logger.error(
          `Failed to auto - create fund - subscription request for user ${user.id}: ${fundSubscriptionError.message} `,
          fundSubscriptionError.stack,
        );

        // Reverse debit and fail approval
        await this.creditUserWallet(
          user.id,
          amount,
          request.reference,
          InvestmentPoolType.MMF,
        );
        request.status = MMFInvestmentRequestStatus.PENDING;
        request.admin_notes = `[AUTO-REVERSED] Fund subscription failed: ${fundSubscriptionError.message}`;
        await this.investmentRequestRepository.save(request);

        throw new InternalServerErrorException(
          `Sync failure: ${fundSubscriptionError.message}. User wallet has been reversed.`,
        );
      }

      // Step 7: Mark request as approved
      request.status = MMFInvestmentRequestStatus.APPROVED;
      await this.investmentRequestRepository.save(request);

      // Send approval email notification
      try {
        const emailData = {
          heading: 'Investment Request Approved – MMF Fund',
          userName: `${user.first_name} ${user.last_name}`,
          introText:
            'We are pleased to inform you that your MMF Fund investment request has been successfully approved and processed.',
          details: [
            { label: 'Fund', value: 'MMF Fund' },
            { label: 'Units Purchased', value: `${request.quantity} Units` },
            {
              label: 'Total Investment Amount',
              value: `₦${Number(request.price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            { label: 'Reference Number', value: request.reference },
          ],
          closingText:
            'Please note that your investment balance will reflect in your portfolio within 24 hours. No further action is required from you at this time.',
          supportText:
            'If you have any questions or require further assistance, our support team is available via support@housemoni.ng',
          type: AuthRequestType.SUBSCRIPTION_CONFIRMATION,
        };

        const html = investment_request_html(emailData);

        const notificationData = {
          sender: 'GDL',
          title: 'Investment Request Approved – MMF Fund',
          description: 'Your MMF investment request has been approved',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: user.email,
          recipients_phone_number: user.phone || 'null',
          request_ref: `INV_${request.reference}${Date.now()}`,
          message: `Your MMF Fund investment request (Ref: ${request.reference}) has been approved.`,
          html: null,
          complete_html_body: html,
          show_advert: false,
          purpose: 'register',
        };

        await this.userService.sendUserAuthNotifications(notificationData);
        this.logger.log(`Approval email sent to ${user.email} `);
      } catch (emailError) {
        this.logger.error(
          `Failed to send approval email: ${emailError.message} `,
          emailError.stack,
        );
      }

      return this.mapToResponseDto(request);
    } catch (error) {
      this.logger.error(
        `Approval failed for request ${requestId}: ${error.message} `,
        error.stack,
      );

      // Rollback to failed status
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });
      if (request) {
        request.status = MMFInvestmentRequestStatus.FAILED;
        request.admin_notes = `${request.admin_notes || ''} | Error: ${
          error.message
        } `;
        await this.investmentRequestRepository.save(request);
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Failed to approve investment request',
      );
    }
  }

  async rejectInvestmentRequest(
    requestId: number,
    adminId: number,
    rejectData: RejectInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Admin ID: ${adminId} rejecting investment request ID: ${requestId} `,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Investment request not found');
      // Only pending or processing requests can be rejected
      if (
        request.status !== MMFInvestmentRequestStatus.PENDING &&
        request.status !== MMFInvestmentRequestStatus.PROCESSING
      ) {
        throw new NotAcceptableException({
          success: 'false',
          response_code: '006',
          response_description:
            'Investment request must be in PENDING or PROCESSING status to be rejected',
          message:
            'Investment request must be in PENDING or PROCESSING status to be rejected',
        });
      }

      request.status = MMFInvestmentRequestStatus.REJECTED;
      request.rejected_by = adminId;
      request.rejected_at = new Date();
      request.admin_notes = rejectData.admin_notes;

      const rejected = await this.investmentRequestRepository.save(request);
      this.logger.log(
        `Investment request ID: ${requestId} rejected successfully`,
      );

      return this.mapToResponseDto(rejected);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(
        `Failed to reject investment request ID: ${requestId} `,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to reject investment request',
      );
    }
  }

  private async debitUserWallet(
    userId: number,
    amount: number,
    transactionRef: string,
    investmentRequestType: any,
  ): Promise<void> {
    this.logger.log(
      `Debiting wallet for user ID: ${userId}, amount: ${amount}, ref: ${transactionRef} `,
    );

    try {
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.MMF,
        );

      if (!userWallet) throw new Error('User wallet not found for debit');

      const transactionData = {
        transaction_reference: `INV - ${transactionRef} `,
        external_reference: transactionRef,
        transaction_type: VirtualWalletTransactionType.DEBIT,
        amount: amount,
        description: `Investment debit for ${investmentRequestType} purchase`,
        receiver_name: 'MMF Investment',
        receiver_account: userWallet.virtual_account_number,
        receiver_bank_code: userWallet.bank_code,
      };

      await this.virtualWalletService.processTransaction(
        userId,
        userWallet.virtual_account_number,
        transactionData,
      );

      this.logger.log(
        `Successfully debited ₦${amount.toLocaleString()} from user ID: ${userId} wallet`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to debit wallet for user ID: ${userId} `,
        error.stack,
      );
      throw error;
    }
  }

  private async creditUserWallet(
    userId: number,
    amount: number,
    transactionRef: string,
    investmentRequestType: any,
  ): Promise<void> {
    this.logger.log(
      `Reversing (crediting) wallet for user ID: ${userId}, amount: ${amount}, ref: ${transactionRef}`,
    );

    try {
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.MMF,
        );

      if (!userWallet)
        throw new Error('User wallet not found for reversal credit');

      const transactionData = {
        transaction_reference: `REV-INV-${transactionRef}`,
        external_reference: transactionRef,
        transaction_type: VirtualWalletTransactionType.CREDIT,
        amount: amount,
        description: `Investment reversal credit for ${investmentRequestType} purchase failure`,
        receiver_name: 'MMF Investment',
        receiver_account: userWallet.virtual_account_number,
        receiver_bank_code: userWallet.bank_code,
      };

      await this.virtualWalletService.processTransaction(
        userId,
        userWallet.virtual_account_number,
        transactionData,
      );

      this.logger.log(
        `Successfully credited ₦${amount.toLocaleString()} back to user ID: ${userId} wallet`,
      );
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to credit wallet during reversal for user ID: ${userId}. Manual intervention required.`,
        error.stack,
      );
      // We don't re-throw here to prevent further cascading issues, but log it as CRITICAL
    }
  }

  async approveFundRedemptionRequest(
    redemptionId: number,
    adminId: number,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(
      `Admin ID ${adminId} attempting to approve fund redemption ID ${redemptionId} `,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Fetch the redemption request
      const redemption = await queryRunner.manager.findOne(
        FundRedemptionMMFRequest,
        {
          where: { id: redemptionId },
        },
      );

      if (!redemption) {
        throw new NotFoundException(
          `Fund redemption request with ID ${redemptionId} not found`,
        );
      }

      if (redemption.status !== FundRedemptionMMFStatus.PROCESSING) {
        throw new BadRequestException(
          'Only processing redemptions can be approved',
        );
      }

      const userId = redemption.user_identity;
      const poolType = InvestmentPoolType.MMF;
      const redemptionAmount = Number(redemption.amount);

      // Step 2: Validate redemption amount
      if (!Number.isFinite(redemptionAmount) || redemptionAmount <= 0) {
        throw new BadRequestException('Invalid redemption amount.');
      }

      // Step 5: Update redemption record
      redemption.status = FundRedemptionMMFStatus.COMPLETED;
      redemption.approved_by = adminId;
      redemption.approved_at = new Date();
      redemption.completed_at = new Date();

      await queryRunner.manager.save(redemption);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Fund redemption approved successfully.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to approve fund redemption ID ${redemptionId}: ${error.message} `,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Unexpected error during fund redemption approval',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async rejectFundRedemptionRequest(
    redemptionId: number,
    adminId: number,
    reason?: string,
  ): Promise<FundRedemptionMMFRequest> {
    this.logger.log(
      `Admin ID ${adminId} attempting to reject fund redemption ID ${redemptionId} `,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Fetch the redemption request
      const redemption = await queryRunner.manager.findOne(
        FundRedemptionMMFRequest,
        {
          where: { id: redemptionId },
        },
      );

      if (!redemption) {
        throw new NotFoundException('Fund redemption request not found');
      }

      // Only processing requests can be rejected
      if (redemption.status !== FundRedemptionMMFStatus.PROCESSING) {
        throw new BadRequestException(
          'Only processing redemptions can be rejected',
        );
      }

      // Step 2: Update redemption record
      redemption.status = FundRedemptionMMFStatus.FAILED;
      redemption.rejected_by = adminId;
      redemption.rejected_at = new Date();
      redemption.admin_notes = reason || 'Redemption request rejected by admin';

      await queryRunner.manager.save(redemption);

      // Step 3: Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Fund redemption ${redemptionId} successfully rejected by admin ${adminId} `,
      );

      return redemption;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to reject redemption ID ${redemptionId}: ${error.message} `,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;

      throw new InternalServerErrorException(
        'Unexpected error during redemption rejection',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private createFundAccountPayload(
    user: any,
    request: any,
    fetchUserNuban: any,
    customerID: any,
  ): any {
    this.logger.log(`Creating Fund Account payload for user: ${user.email} `);

    const defaultFund =
      this.configService.get<string>('DEFAULT_FUND') || 'DEFAULT_FUND';

    return {
      create: [
        {
          customer: customerID,
          fund: defaultFund,
          account: fetchUserNuban.nuban_account,
          accountname: `${(user.first_name || '').trim()} ${(
            user.last_name || ''
          ).trim()} `.trim(),
          externalref: user.id,
        },
      ],
    };
  }

  private async validateUserBalance(
    userId: number,
    requestAmount: number,
    excludeRequestId?: number,
  ): Promise<void> {
    this.logger.log(
      `🔍 Validating total balance (including pending) for user ID: ${userId}, new request: ₦${requestAmount.toLocaleString()}`,
    );

    try {
      // ✅ Step 1: Calculate pending MMF investments
      const mmfQuery = this.investmentRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: MMFInvestmentRequestStatus.PENDING,
        });

      if (excludeRequestId) {
        mmfQuery.andWhere('req.id != :excludeRequestId', { excludeRequestId });
      }
      const { total: pendingMMF } = await mmfQuery.getRawOne();

      // ✅ Step 2: Calculate pending Canary investments
      const canaryQuery = this.canaryRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: CanaryInvestmentRequestStatus.PENDING,
        });
      const { total: pendingCanary } = await canaryQuery.getRawOne();

      // ✅ Step 3: Calculate pending Income investments
      const incomeQuery = this.incomeRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: IncomeInvestmentRequestStatus.PENDING,
        });
      const { total: pendingIncome } = await incomeQuery.getRawOne();

      console.log(
        `[DEBUG MMF] Pending: MMF=${pendingMMF}, Canary=${pendingCanary}, Income=${pendingIncome}`,
      );

      const totalPendingLiabilities =
        (Number(pendingMMF) || 0) +
        (Number(pendingCanary) || 0) +
        (Number(pendingIncome) || 0);

      // ✅ Step 4: Fetch wallet balance (Computed)
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.MMF, // Always MMF logic in this service
        );

      if (!userWallet) {
        throw new BadRequestException(
          'No specific virtual wallet found for this investment type. Please ensure your UBA virtual account is created.',
        );
      }

      // ✅ Step 5: Validate total capacity
      const totalAmountRequired = totalPendingLiabilities + requestAmount;
      console.log('totalAmountRequired', totalAmountRequired);

      // ✅ Step 6: Validate against wallet balance
      if (totalAmountRequired > userWallet.current_balance) {
        const availableBalance =
          totalAmountRequired - userWallet.current_balance;
        throw new NotAcceptableException({
          message: `Insufficient Wallet Balance. Total pending investments across all funds plus new request is ₦${totalAmountRequired.toLocaleString()}. Available Balance: ₦${userWallet?.current_balance.toLocaleString()}. Kindly fund your wallet with this amount ₦${availableBalance.toLocaleString()} or above to proceed with this investment request.`,
          response_code: '016',
        });
      }

      this.logger.log(
        `✅ Balance validation successful for user ID: ${userId}`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotAcceptableException
      ) {
        throw error;
      }
      this.logger.error(
        `Balance validation failed for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to validate user balance');
    }
  }

  /**
   * Create and process fund redemption request to Symplus API
   */
  async fundRedemption(
    userId: number,
    createFundRedemptionDto: CreateFundRedemptionDto,
  ): Promise<FundRedemptionResponseDto> {
    this.logger.log(`Initiating fund redemption for user ${userId}`);

    try {
      // 🔹 1. Fetch the user by ID
      const user = await this.userService.findUserById(userId);
      if (!user) throw new NotFoundException('User not found');
      this.logger.log(`User found: ${user.first_name} ${user.last_name} `);

      // 🔹 2. Validation: Check Total Pending Redemptions & Investment Balance
      // ------------------------------------------------------------------
      // Calculate total pending redemption amount (sum of PROCESSING requests)
      const { total: totalPendingRedemptionsRaw } =
        await this.fundRedemptionRepository
          .createQueryBuilder('redemption')
          .select('SUM(redemption.amount)', 'total')
          .where('redemption.user_identity = :userId', { userId })
          .andWhere('redemption.status = :status', {
            status: FundRedemptionMMFStatus.PROCESSING,
          })
          .getRawOne();

      const totalPendingRedemptions = Number(totalPendingRedemptionsRaw) || 0;

      // Fetch user's total active investment
      const activeInvestment = await this.getUserTotalActiveInvestmentAmount(
        userId,
      );
      const currentBalance =
        activeInvestment?.investment?.market_value &&
        !isNaN(Number(activeInvestment.investment.market_value))
          ? Number(activeInvestment.investment.market_value)
          : 0;

      const redemptionAmount = Number(createFundRedemptionDto.amount);
      if (!Number.isFinite(redemptionAmount) || redemptionAmount <= 0) {
        throw new BadRequestException('Invalid redemption amount.');
      }

      // Logic: New Request + Pending Redemptions <= Current Balance
      const totalLiabilities = totalPendingRedemptions + redemptionAmount;

      if (totalLiabilities > currentBalance) {
        const availableRedeemable = Math.max(
          0,
          currentBalance - totalPendingRedemptions,
        );
        throw new NotAcceptableException({
          message: `Redemption Request Exceeds Balance. You have ₦${totalPendingRedemptions.toLocaleString()} in pending redemptions. Your current investment balance is ₦${currentBalance.toLocaleString()}. You can only redeem up to ₦${availableRedeemable.toLocaleString()} more.`,
          response_code: '016',
        });
      }

      // 🔹 4. Fetch user's NUBAN and wallet details
      const userNubanDetails =
        await this.nubanAccountsService.fetchUserNubanWitheDetails(user.id);

      // 🔹 5. Create local redemption record
      const fundRedemption = this.fundRedemptionRepository.create({
        user_identity: user.id, // <-- assign the foreign key directly
        first_name: user.first_name,
        last_name: user.last_name,
        account: userNubanDetails?.nuban_account || 'TEST-ACCOUNT',
        redemption_date: new Date(),
        amount: redemptionAmount,
        quantity: 0,
        reference: `RDM-${Date.now()}`, // safe to store as string
        fund_account_no: userNubanDetails?.FundAccountNo || 'Manual',
        cash_account_no: userNubanDetails?.CashAccountNo || 'Manual',
        status: FundRedemptionMMFStatus.PROCESSING,
      });

      await this.fundRedemptionRepository.save(fundRedemption);

      this.logger.log(
        `Created redemption request ₦${redemptionAmount} for user ${userId} (reference: ${fundRedemption.reference}).`,
      );

      // 🔹 6. Call Symplus API
      try {
        const userWallet =
          await this.virtualWalletService.findWalletForInvestment(
            userId,
            InvestmentPoolType.MMF,
          );

        if (userWallet?.FundAccountNo) {
          const symplusRedemptionUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-redemption`;

          const defaultFund =
            this.configService.get<string>('DEFAULT_FUND') || 'DEFAULT_FUND';

          const redemptionPayload: FundRedemptionDto = {
            redemption: [
              {
                fund: defaultFund,
                account: userWallet.FundAccountNo,
                date: new Date().toISOString().split('T')[0],
                price: 10,
                quantity: Number(redemptionAmount) / 10,
                reference: fundRedemption.reference,
              },
            ],
          };

          this.logger.log(
            `Initiating Symplus fund-redemption for user ${userId} / ref ${fundRedemption.reference}`,
          );

          const resCall = await this.externalApiCallsService.postData(
            symplusRedemptionUrl,
            redemptionPayload,
          );

          console.log('resCall', resCall);

          this.logger.log(
            `Successfully initiated fund-redemption request for user ${userId}`,
          );
        } else {
          this.logger.warn(
            `Missing FundAccountNo for user ${userId}; skipping Symplus fund-redemption request.`,
          );
        }
      } catch (symplusError) {
        this.logger.error(
          `Failed to call Symplus fund-redemption for user ${userId}: ${symplusError.message}`,
          symplusError.stack,
        );
      }

      // ------------------------------------------------------------------
      // USER NOTIFICATION (Redemption Received)
      // ------------------------------------------------------------------
      try {
        const emailData = {
          heading: 'Fund Redemption Request Received',
          userName: `${user.first_name} ${user.last_name}`,
          introText:
            'We have received your request to redeem funds from your MMF investment. Your request is currently being processed.',
          details: [
            { label: 'Transaction Type', value: 'Fund Redemption' },
            {
              label: 'Amount',
              value: `₦${Number(redemptionAmount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            { label: 'Reference Number', value: fundRedemption.reference },
            { label: 'Date', value: new Date().toLocaleString() },
          ],
          closingText:
            'Processing usually takes up to 24 hours. You will be notified once the transaction is complete.',
          supportText:
            'If you have any questions, contact our support team at support@housemoni.ng',
          type: AuthRequestType.SUBSCRIPTION_CONFIRMATION,
        };

        const html = investment_request_html(emailData);

        const notificationData = {
          sender: 'GDL',
          title: 'Fund Redemption Request Received',
          description:
            'Your fund redemption request has been received and is processing.',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: user.email,
          recipients_phone_number: user.phone || 'null',
          request_ref: `RDM_${fundRedemption.reference}${Date.now()}`,
          message: `Your fund redemption request (Ref: ${fundRedemption.reference}) is being processed.`,
          html: null,
          complete_html_body: html,
          show_advert: false,
          purpose: 'register',
        };

        await this.userService.sendUserAuthNotifications(notificationData);
        this.logger.log(`Redemption received email sent to ${user.email}`);
      } catch (emailError) {
        this.logger.error(
          `Failed to send redemption received email: ${emailError.message}`,
          emailError.stack,
        );
      }

      // ------------------------------------------------------------------
      // INTERNAL STAFF NOTIFICATION (MMF Redemption)
      // ------------------------------------------------------------------
      try {
        const userWallet =
          await this.virtualWalletService.findWalletForInvestment(
            userId,
            InvestmentPoolType.MMF,
          );

        // Decrypt Symplus ID if available
        let symplusId = 'Not Available';
        if (userWallet?.encrypted_symplus_customer_id) {
          try {
            symplusId = await this.symplusService.getDecryptedCustomerId(
              userWallet.id,
            );
          } catch (e) {
            this.logger.warn(
              `Failed to decrypt Symplus ID for internal email: ${e.message}`,
            );
          }
        }

        const internalEmailData = {
          heading: 'New MMF Redemption Request - Action Required',
          userName: 'Admin',
          introText: `A new MMF redemption request has been submitted by <b>${user.first_name} ${user.last_name}</b>.`,
          details: [
            {
              label: 'Customer Name',
              value: `${user.first_name} ${user.last_name}`,
            },
            { label: 'Symplus ID', value: symplusId },
            { label: 'Redemption Type', value: 'MMF Redemption' },
            {
              label: 'Amount',
              value: `₦${Number(redemptionAmount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            { label: 'Reference', value: fundRedemption.reference },
            { label: 'Date', value: new Date().toLocaleString() },
          ],
          closingText:
            'Please review and process this request on the admin dashboard.',
          supportText: '',
          signOff: 'System Notification',
        };

        const internalHtml = investment_request_html(internalEmailData);
        const randomID = randomUUID();
        const internalNotificationData = {
          sender: 'GDL System',
          title: 'New MMF Redemption Request',
          description: 'New MMF Redemption Request',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id, // Notification service might require a user ID
          recipients_email: 'yadekoya@housemoni.ng',
          recipients_phone_number: 'null',
          request_ref: `INT_RDM_${
            fundRedemption.reference
          }${Date.now()}${randomID}`,
          message: `New MMF Redemption Request from ${user.first_name} ${user.last_name}`,
          html: null,
          complete_html_body: internalHtml,
          show_advert: false,
          purpose: 'register',
        };

        // Send to primary admin
        await this.userService.sendUserAuthNotifications(
          internalNotificationData,
        );

        // Send to CC admin
        const ccNotificationData = {
          ...internalNotificationData,
          recipients_email: 'aanurunkem@housemoni.ng',
        };
        await this.userService.sendUserAuthNotifications(ccNotificationData);

        this.logger.log(`Internal redemption notification sent to staff`);
      } catch (internalEmailError) {
        this.logger.error(
          `Failed to send internal redemption notification: ${internalEmailError.message}`,
          internalEmailError.stack,
        );
      }

      return {
        success: true,
        message:
          'Fund redemption is being processed and it will be done within 24hrs',
        reference: fundRedemption.reference,
        status: fundRedemption.status,
        created_at: fundRedemption.created_at,
      };
    } catch (error) {
      this.logger.error(
        `Redemption failed for user ${userId}: ${error.message} `,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to initiate fund redemption.',
      );
    }
  }

  async getUserRedemptions(
    userId: number,
    queryParams: GetRedemptionRequestsDto,
  ): Promise<{
    redemptions: FundRedemptionAdminResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Fetching redemptions for user ID: ${userId}`);

    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        search,
      } = queryParams;
      const skip = (page - 1) * limit;

      const cleanedSearch = search
        ? search.toString().trim().toLowerCase().replace(/[%_]/g, '')
        : null;

      const qb = this.fundRedemptionRepository
        .createQueryBuilder('redemption')
        .where('redemption.user_identity = :userId', { userId });

      if (status) {
        qb.andWhere('redemption.status = :status', { status });
      }

      if (start_date && end_date) {
        qb.andWhere('redemption.created_at BETWEEN :start AND :end', {
          start: new Date(start_date),
          end: new Date(end_date),
        });
      }

      if (cleanedSearch) {
        qb.andWhere(
          `(LOWER(redemption.first_name) LIKE :search
          OR LOWER(redemption.last_name) LIKE :search
          OR LOWER(redemption.account) LIKE :search
          OR LOWER(redemption.reference) LIKE :search)`,
          { search: `%${cleanedSearch}%` },
        );
      }

      qb.orderBy('redemption.created_at', 'DESC').skip(skip).take(limit);

      const [requests, total] = await qb.getManyAndCount();

      return {
        redemptions: requests.map((r) =>
          this.mapToFundRedemptionAdminResponseDto(r),
        ),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch user redemptions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch user redemptions',
      );
    }
  }

  async getAllRedemptionFund(queryParams: any): Promise<{
    requests: FundRedemptionAdminResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        search,
      } = queryParams;
      const skip = (page - 1) * limit;

      this.logger.log(
        `Admin retrieved ${JSON.stringify(
          queryParams,
        )} fund redemption records.`,
      );

      const cleanedSearch = search
        ? search.toString().trim().toLowerCase().replace(/[%_]/g, '')
        : null;

      const qb = this.fundRedemptionRepository
        .createQueryBuilder('redemption')
        .leftJoinAndSelect('redemption.user', 'user');

      if (status) {
        qb.andWhere('redemption.status = :status', { status });
      }

      if (start_date && end_date) {
        qb.andWhere('redemption.created_at BETWEEN :start AND :end', {
          start: new Date(start_date),
          end: new Date(end_date),
        });
      }

      if (cleanedSearch) {
        qb.andWhere(
          `(LOWER(redemption.first_name) LIKE :search
          OR LOWER(redemption.last_name) LIKE :search
          OR LOWER(redemption.account) LIKE :search
          OR LOWER(redemption.reference) LIKE :search
          OR LOWER(user.first_name) LIKE :search
          OR LOWER(user.last_name) LIKE :search)`,
          { search: `%${cleanedSearch}%` },
        );
      }

      qb.orderBy('redemption.created_at', 'DESC').skip(skip).take(limit);

      const [requests, total] = await qb.getManyAndCount();

      const mappedRequests = requests.map((r) =>
        this.mapToFundRedemptionAdminResponseDto(r),
      );

      return {
        requests: mappedRequests,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to fetch fund redemption records: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch fund redemption records',
      );
    }
  }

  async getRedemptionFundById(id: number): Promise<FundRedemptionMMFRequest> {
    try {
      this.logger.log(`Admin fetching fund redemption record with ID: ${id} `);

      // 🔹 Step 1: Fetch record with related entities
      const redemption = await this.fundRedemptionRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      // 🔹 Step 2: Handle not found case
      if (!redemption) {
        this.logger.warn(`Fund redemption record not found with ID: ${id} `);
        throw new NotFoundException(`Fund redemption record not found`);
      }

      // 🔹 Step 3: Map entity to response DTO
      // const mappedResponse = this.mapToFundRedemptionAdminResponseDto(redemption);

      // 🔹 Step 4: Return formatted response
      return redemption;
    } catch (error) {
      this.logger.error(
        `Admin failed to fetch fund redemption record with ID: ${id} `,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch fund redemption record',
      );
    }
  }

  private mapToFundRedemptionAdminResponseDto(
    entity: FundRedemptionMMFRequest,
  ): FundRedemptionAdminResponseDto {
    const maskAccount = (account: string) => {
      if (!account) return null;
      return account.length > 4 ? `**** ${account.slice(-4)} ` : '****';
    };

    return {
      id: entity.id,
      user_id: entity.user_identity,
      first_name: entity.first_name,
      last_name: entity.last_name,
      account: maskAccount(entity.account),
      redemption_date: entity.redemption_date,
      amount: entity.amount,
      reference: entity.reference,
      status: entity.status,
      transaction_response: entity.transaction_response,
      completed_at: entity.completed_at,
      failed_at: entity.failed_at,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  /**
   * Create the payload for fund redemption API call
   * Uses the decrypted Symplus customer ID for the customer field
   */
  private createFundRedemptionPayload(
    user: any,
    redemptionDto: CreateFundRedemptionDto,
    userWallet: VirtualWallet,
    decryptedCustomerId: string,
  ): any {
    this.logger.log(
      `Creating fund redemption payload for user: ${user.email} `,
    );
    this.logger.log(`Using Symplus customer ID: ${decryptedCustomerId} `);

    return {
      redeem: [
        {
          fund: redemptionDto.fund,
          account: userWallet.CashAccountNo,
          amount: redemptionDto.amount,
          customer: decryptedCustomerId, // Use decrypted Symplus customer ID
          reference: redemptionDto.reference || `RDM - ${Date.now()} `,
          externalref: user.user_txn_ref,
          notes: redemptionDto.notes || 'Fund redemption request',
        },
      ],
    };
  }

  private mapToResponseDto(
    request: MMFInvestmentRequest,
  ): InvestmentRequestResponseDto {
    const amount = Number(request.price);
    return {
      id: request.id,
      user_id: request.user_id,
      first_name: request.first_name,
      last_name: request.last_name,
      account: request.account,
      date: request.date,
      price: request.price,
      quantity: request.quantity,
      reference: request.reference,
      status: request.status,
      admin_notes: request.admin_notes,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_by: request.rejected_by,
      rejected_at: request.rejected_at,
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }

  /**
   * Another secure approach: generate a numeric string using BigInt from random bytes.
   * Slightly different from generate20DigitNumber but also returns exactly 20 digits.
   */
  generateSecure20DigitNumber(): string {
    const hex = randomBytes(12).toString('hex');
    const big = BigInt('0x' + hex).toString();
    return big.padStart(20, '0').slice(0, 20);
  }

  async retryFundSubscriptionIfMissing(
    user: any,
    request: MMFInvestmentRequest,
  ) {
    try {
      // 1. Check Redemptions (must be none)
      const redemptions = await this.fundRedemptionRepository.count({
        where: { user_identity: user.id },
      });

      if (redemptions > 0) return;

      // 3. Retry Subscription
      const wallet = await this.virtualWalletService.findWalletForInvestment(
        user.id,
        InvestmentPoolType.MMF,
      );

      // 2. Check Symplus Balance (must be zero)
      // We expect getUserFundAccounts to return the Symplus response object
      // data: { GetFundAccounts: [...] }
      const fundAccountsBox = await this.getUserFundAccounts(user.id);
      const accounts = fundAccountsBox?.data?.GetFundAccounts || [];

      // Sum up current value across all accounts
      const totalValue = accounts.reduce(
        (sum, acc) => sum + (Number(acc.CURRENT_VALUE) || 0),
        0,
      );

      // If user has money, we assume subscription worked
      if (totalValue > 0) return;

      this.logger.log(
        `[Self-Healing] User ${user.id} has APPROVED request but 0 balance and NO redemptions. Retrying subscription.`,
      );

      if (!wallet || !wallet.FundAccountNo) {
        console.log(
          `[Self-Healing] User ${user.id} missing wallet/FundAccountNo. Cannot retry.`,
        );
        return;
      }

      const fundSubscriptionPayload = {
        subscription: [
          {
            fund:
              this.configService.get<string>('DEFAULT_FUND') || 'DEFAULT_FUND',
            account: wallet.FundAccountNo,
            date: new Date().toISOString().split('T')[0],
            price: 10,
            quantity: Number(request.quantity),
            reference: `${request.reference}-${Date.now()}`,
          },
        ],
      };

      const symplusFundSubscriptionUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-subscription`;

      this.logger.log(
        `Initiating auto - fund - subscription request for user ${user.id} / ref ${request.reference} `,
      );

      // Fire and forget
      await this.externalApiCallsService.postData(
        symplusFundSubscriptionUrl,
        fundSubscriptionPayload,
      );

      this.logger.log(
        `[Self-Healing] Retry subscription sent for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[Self-Healing] Failed to retry subscription for user ${user.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
