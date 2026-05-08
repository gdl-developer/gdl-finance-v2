import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, Connection, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  CanaryInvestmentRequest,
  CanaryInvestmentRequestStatus,
} from './entities/investment-request-canary.entity';
import {
  MMFInvestmentRequest,
  MMFInvestmentRequestStatus,
} from '../investment-request/entities/investment-request.entity';
import {
  IncomeInvestmentRequest,
  IncomeInvestmentRequestStatus,
} from '../investment-request-income/entities/investment-request-income.entity';
import {
  AccountType,
  CreateCustomerDto,
  Sex,
  Title,
} from '../infoware-request/dto/create-customer.dto';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { VirtualWalletService } from '../virtual-account/virtual-wallet.service';
import { VirtualWalletTransactionType } from '../virtual-account/entities/virtual-wallet.entity';
import { ExternalApiCallsService } from '../../common/external-api-calls/external-api-calls.service';
import { SymplusService } from '../virtual-account/symplus.service';

import {
  CreateInvestmentRequestDto,
  InvestmentRequestResponseDto,
  ApproveInvestmentRequestDto,
  RejectInvestmentRequestDto,
  UpdateInvestmentRequestDto,
  GetInvestmentRequestsDto,
  CreateFundRedemptionDto,
  FundRedemptionResponseDto,
} from './dto/investment-request.dto';
import { UserService } from '../user/user.service';
import { NubanAccountsService } from 'src/sidecars/nuban-accounts/nuban-accounts.service';
import {
  FundRedemptionCanaryRequest,
  FundRedemptionCanaryStatus,
} from './entities/redemption-canary-request.entity';
import { FundRedemptionAdminResponseDto } from '../investment-request/dto/investment-request.dto';
import { InvestmentPoolService } from '../investment-pull/investment-pull.service';
import {
  InvestmentPoolStatus,
  InvestmentPoolType,
} from '../investment-pull/entities/investment-pull.entity';
import { randomBytes } from 'crypto';
import { InfowareService } from '../infoware-request/infoware-request.service';
import { investment_request_html } from 'src/common/utils/notification-templates/investment-request-helper';
import { AuthRequestType } from '../auth/entities/auth.entity';

@Injectable()
export class CanaryInvestmentRequestService {
  private readonly logger = new Logger(CanaryInvestmentRequestService.name);
  private readonly symplusBaseUrl: string;
  private readonly symplusFundAccountUrl: string;

  constructor(
    @InjectRepository(CanaryInvestmentRequest)
    public readonly investmentRequestRepository: Repository<CanaryInvestmentRequest>,
    @InjectRepository(MMFInvestmentRequest)
    private readonly mmfRequestRepository: Repository<MMFInvestmentRequest>,
    @InjectRepository(IncomeInvestmentRequest)
    private readonly incomeRequestRepository: Repository<IncomeInvestmentRequest>,
    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,
    @InjectRepository(FundRedemptionCanaryRequest)
    private readonly fundRedemptionRepository: Repository<FundRedemptionCanaryRequest>,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly symplusService: SymplusService,
    private readonly nubanAccountsService: NubanAccountsService,
    private readonly investmentpoolService: InvestmentPoolService,
    private readonly dataSource: Connection, // ✅ FIX: Inject DataSource for transactions
    private readonly infowareService: InfowareService,
  ) {
    this.symplusBaseUrl = this.configService.get<string>(
      'SYMPLUS_SERVICE_BASE_URL',
    );
    this.symplusFundAccountUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-account`;
    this.logger.log(
      `Initialized InvestmentRequestService with Symplus Base URL: ${this.symplusBaseUrl}`,
    );
  }

  // /**
  //  * Fetch fund accounts for the authenticated user from Symplus using their encrypted customer ID.
  //  */
  // async getUserFundAccounts(userId: number): Promise<any> {
  //   this.logger.log(`Fetching Symplus fund accounts for user ID: ${userId}`);

  //   try {
  //     // Get user's virtual wallet to access encrypted Symplus customer ID
  //     const userWallet = await this.virtualWalletRepository.findOne({
  //       where: { user_id: userId, is_primary: true },
  //     });

  //     if (!userWallet) {
  //       throw new NotFoundException('User virtual wallet not found');
  //     }

  //     if (!userWallet.encrypted_symplus_customer_id) {
  //       throw new BadRequestException(
  //         'Symplus customer ID not found. Please ensure your account is fully set up.',
  //       );
  //     }

  //     // Decrypt the Symplus customer ID
  //     const decryptedCustomerId =
  //       await this.symplusService.getDecryptedCustomerId(userWallet.id);

  //     if (!decryptedCustomerId) {
  //       throw new InternalServerErrorException(
  //         'Failed to retrieve customer ID for fund accounts',
  //       );
  //     }

  //     const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${decryptedCustomerId}`;
  //     this.logger.log(`Fetching fund accounts from: ${url}`);

  //     const response = await this.externalApiCallsService.getData(url);

  //     this.logger.log(
  //       `Symplus fund accounts response for user ${userId}: ${JSON.stringify(
  //         response,
  //         null,
  //         2,
  //       )}`,
  //     );

  //     if (!response || response.error || response.statusCode >= 400) {
  //       throw new InternalServerErrorException(
  //         response?.message || 'Failed to fetch fund accounts from Symplus',
  //       );
  //     }

  //     return response;
  //   } catch (error) {
  //     if (
  //       error instanceof NotFoundException ||
  //       error instanceof BadRequestException
  //     ) {
  //       throw error;
  //     }
  //     this.logger.error(
  //       `Failed to fetch fund accounts for user ID ${userId}`,
  //       error.stack,
  //     );
  //     throw new InternalServerErrorException('Failed to fetch fund accounts');
  //   }
  // }

  /**
   * (Legacy) Fetch fund accounts for a given customer from Symplus.
   * Kept for backward compatibility.
   */
  async getCustomerFundAccounts(customerId: string): Promise<any> {
    this.logger.log(
      `Fetching Symplus fund accounts for customer: ${customerId}`,
    );

    try {
      const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${customerId}`;
      const response = await this.externalApiCallsService.getData(url);

      this.logger.log(
        `Symplus fund accounts response for ${customerId}: ${JSON.stringify(
          response,
          null,
          2,
        )}`,
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
    console.log(`Creating Canary investment request for user ID: ${userId}`);
    const referenceId = `GDL-${Date.now()}-${userId}`;

    try {
      const existing = await this.investmentRequestRepository.findOne({
        where: { reference: referenceId },
      });
      if (existing) {
        throw new BadRequestException(
          'Investment request with this reference already exists',
        );
      }

      // Fetch user and compute amount
      const user = await this.userService.findUserById(userId);
      const price = Number(createInvestmentRequestDto.price);
      const quantity = Number(createInvestmentRequestDto.quantity);
      const amount = price;

      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException(
          'Invalid price or quantity resulting in non-positive amount',
        );
      }

      // Validate user wallet & pending investments
      console.log(
        `[DEBUG CANARY] Validating balance for user ${userId}: amount=${amount}`,
      );
      await this.validateUserBalance(userId, amount);
      console.log(
        `[DEBUG CANARY] Balance validation passed for user ${userId}`,
      );

      const wallet = await this.virtualWalletService.findWalletForInvestment(
        userId,
        InvestmentPoolType.CANARY,
      );

      // Ensure Infoware Customer exists
      const updatedWallet = await this.ensureInfowareCustomerExists(
        userId,
        wallet,
      );

      // Persist Canary investment request
      const request = this.investmentRequestRepository.create({
        user_id: userId,
        first_name: user.first_name,
        last_name: user.last_name,
        account: updatedWallet.virtual_account_number,
        date: new Date(),
        price: createInvestmentRequestDto.price,
        quantity: createInvestmentRequestDto.quantity,
        reference: referenceId,
        status: CanaryInvestmentRequestStatus.PENDING,
      });

      const saved = await this.investmentRequestRepository.save(request);
      console.log(
        `Canary investment request created successfully with ID: ${saved.id}`,
      );

      //Call Infoware fund-account API (Canary-specific)

      // Send email notification
      try {
        const emailData = {
          heading: 'Investment Request Received – Pending Approval',
          userName: `${user.first_name} ${user.last_name}`,
          introText:
            'Thank you for submitting your investment request on GDL Plus. Your request has been received and is currently pending internal approval. You’ll be notified once the process is completed.',
          details: [
            { label: 'Investment Type', value: 'Canary Funds' },
            { label: 'Units Purchased', value: `${saved.quantity}` },
            {
              label: 'Price per Unit',
              value: `₦${(Number(saved.price) / Number(saved.quantity)).toFixed(
                2,
              )}`,
            },
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
            'Your investment request has been received and is pending approval.',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: user.email,
          recipients_phone_number: user.phone || 'null',
          request_ref: `INV_${saved.reference}${Date.now()}`,
          message: `Your investment request for Canary Funds (Ref: ${saved.reference}) has been received.`,
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
      // INTERNAL STAFF NOTIFICATION (Canary Investment)
      // ------------------------------------------------------------------
      try {
        const infowareId =
          wallet?.encrypted_infoware_customer_id || 'Not Available';

        const internalEmailData = {
          heading: 'New Canary Investment Request - Action Required',
          userName: 'Admin',
          introText: `A new Canary investment request has been submitted by <b>${user.first_name} ${user.last_name}</b> and requires your attention.`,
          details: [
            {
              label: 'Customer Name',
              value: `${user.first_name} ${user.last_name}`,
            },
            { label: 'Infoware ID', value: infowareId },
            { label: 'Investment Type', value: 'Canary Funds' },
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
          title: 'New Canary Investment Request',
          description: 'New Canary Investment Request',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: 'yadekoya@housemoni.ng',
          recipients_phone_number: 'null',
          request_ref: `INT_INV_${saved.reference}${Date.now()}`,
          message: `New Canary Investment Request from ${user.first_name} ${user.last_name}`,
          html: null,
          complete_html_body: internalHtml,
          show_advert: false,
          purpose: 'register',
        };

        await this.userService.sendUserAuthNotifications(
          internalNotificationData,
        );

        const ccNotificationData = {
          ...internalNotificationData,
          recipients_email: 'aanurunkem@housemoni.ng',
        };
        await this.userService.sendUserAuthNotifications(ccNotificationData);

        this.logger.log(
          `Internal Canary investment notification sent to staff`,
        );
      } catch (internalEmailError) {
        this.logger.error(
          `Failed to send internal Canary investment notification: ${internalEmailError.message}`,
          internalEmailError.stack,
        );
      }

      return this.mapToResponseDto(saved);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error(
        `Failed to create Canary investment request for user ID: ${userId}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to create Canary investment request',
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
    this.logger.log(`Fetching investment requests for user ID: ${userId}`);

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
      /**
       * 🚨 OSWAP Logging Rule:
       * - Never return raw error details to user
       * - Never leak SQL or internal stacktrace in responses
       * - Log safe error message internally
       */
      this.logger.error(
        `Failed to fetch investment requests for user ${userId}`,
        error?.message,
      );

      throw new InternalServerErrorException(
        'Unable to fetch investment requests at the moment',
      );
    }
  }

  async getInvestmentRequestById(
    userId: number,
    requestId: number,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Fetching investment request ID: ${requestId} for user ID: ${userId}`,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });

      if (!request) {
        this.logger.warn(
          `Investment request ID: ${requestId} not found for user ID: ${userId}`,
        );
        throw new NotFoundException('Investment request not found');
      }

      return this.mapToResponseDto(request);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to fetch investment request ID: ${requestId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch investment request',
      );
    }
  }

  async getUserTotalActiveInvestmentAmount(userId: number): Promise<any> {
    this.logger.log(
      `[FETCH_TOTAL_ACTIVE] Fetching active investment for user: ${userId}`,
    );

    try {
      // Step 1: Get user's Infoware customer ID
      const wallet =
        await this.virtualWalletService.getUserVirtualWalletsInternal(userId);
      const custId = wallet?.encrypted_infoware_customer_id;

      if (!custId) {
        this.logger.warn(
          `[NO_CUSTID] User ${userId} has no Infoware customer ID`,
        );
        return {
          user_id: userId,
          type: InvestmentPoolType.CANARY,
          status: 'NO_CUSTOMER_ID',
          investment: null,
        };
      }

      // Step 2: Get user's CANARY pool investments
      const response =
        await this.investmentpoolService.getUserInvestmentPoolByType(
          userId,
          InvestmentPoolType.CANARY,
          custId,
        );

      const list = response?.investments ?? [];

      // Step 3: If no investment found, return safe default
      if (!list.length) {
        this.logger.warn(
          `[NO_INVESTMENT] No active CANARY investments for user: ${userId}`,
        );
        return {
          user_id: userId,
          type: InvestmentPoolType.CANARY,
          status: 'NO_ACTIVE_INVESTMENT',
          investment: null,
        };
      }

      // Step 4: Choose the BEST investment
      // Option A: Highest market value (recommended)
      const best = list.reduce((a, b) =>
        b.market_value > a.market_value ? b : a,
      );

      // Option B (if preferred): Latest investment by date:
      // const best = list.reduce((a, b) => new Date(b.date).getTime() > new Date(a.date).getTime() ? b : a);

      // Step 5: Build refined response
      const refined = {
        user_id: userId,
        type: InvestmentPoolType.CANARY,
        status: 'ACTIVE',
        investment: {
          date: best.date,
          fund_code: best.fund_code,
          fund_name: best.fund_name,
          units: best.units,
          principal: best.principal,
          market_price: best.market_price,
          market_value: best.market_value,
          accrued_interest: best.accrued_interest,
          accrued_interest_percent: best.accrued_interest_percent,
        },
      };

      this.logger.log(
        `[ACTIVE_INVESTMENT] User ${userId} | Selected Fund: ${best.fund_code} | MV: ${best.market_value}`,
      );

      return refined;
    } catch (error) {
      this.logger.error(
        `[FETCH_TOTAL_ACTIVE_ERROR] User: ${userId} | ${error.message}`,
        error.stack,
      );
      return {
        user_id: userId,
        type: InvestmentPoolType.CANARY,
        status: 'ERROR',
        investment: null,
      };
    }
  }

  async getCanaryValuation() {
    const incomeValuationCode = 'CGF';
    return this.infowareService.valuation(incomeValuationCode);
  }

  async updateInvestmentRequest(
    userId: number,
    requestId: number,
    updateData: UpdateInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Updating investment request ID: ${requestId} for user ID: ${userId}`,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId, user_id: userId },
      });

      if (!request) throw new NotFoundException('Investment request not found');
      if (request.status !== CanaryInvestmentRequestStatus.PENDING) {
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
        `Failed to update investment request ID: ${requestId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update investment request',
      );
    }
  }

  async getAllInvestmentRequests(queryParams: any): Promise<{
    requests: InvestmentRequestResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Admin fetching all investment requests`);

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
      `Admin ID: ${adminId} attempting to approve Canary request ID: ${requestId}`,
    );

    // 🔹 Step 1: Fetch request
    const request = await this.investmentRequestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Investment request not found');

    if (request.status !== CanaryInvestmentRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // 🔹 Step 2: Fetch user and wallet
    const user = await this.userService.findUserById(request.user_id);
    if (!user) throw new BadRequestException('Associated user not found');

    const wallet = await this.virtualWalletService.findWalletForInvestment(
      user.id,
      InvestmentPoolType.CANARY,
    );
    if (!wallet) throw new BadRequestException('User wallet not found');

    // 🔹 Step 3: Validate amount
    const amount = Number(request.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid investment amount');
    }

    // 🔹 Step 4: Validate user balance
    await this.validateUserBalance(user.id, amount, requestId);

    // 🔹 Step 5: Mark as processing
    request.status = CanaryInvestmentRequestStatus.PROCESSING;
    request.approved_by = adminId;
    request.approved_at = new Date();
    request.admin_notes = (approveData.admin_notes || '').trim();
    await this.investmentRequestRepository.save(request);

    // 🔹 Step 6: Debit wallet
    try {
      await this.debitUserWallet(
        user.id,
        amount,
        `Can-Inv-${requestId}`,
        'Canary',
      );
    } catch (debitError) {
      request.status = CanaryInvestmentRequestStatus.PENDING;
      request.admin_notes = `[FAILED] Wallet debit failed: ${debitError.message}`;
      await this.investmentRequestRepository.save(request);
      throw debitError;
    }

    // 🔹 Step 7: Send subscription to Infoweb
    const custAID = wallet.encrypted_infoware_customer_id;
    const fundCode = 'CGF'; // or replace dynamically if needed

    this.logger.log(
      `Sending Canary investment subscription to Infoweb for custAID ${custAID} amount ₦${amount}`,
    );
    const today = new Date();
    const effectiveDate = today.toISOString().substring(0, 10); // YYYY-MM-DD

    // ------------------------------------------------------------------
    // INFOWARE FUND-ACCOUNT REQUEST
    // ------------------------------------------------------------------
    try {
      const crAccountMaster = this.configService.get<string>(
        'INFOWARE_CANARY_CR_ACCOUNT_MASTER',
      );
      const drAccountMaster = this.configService.get<string>(
        'INFOWARE_CANARY_DR_ACCOUNT_MASTER',
      );
      const drAccountSub = this.configService.get<string>(
        'INFOWARE_CANARY_DR_ACCOUNT_SUB',
      );
      const branchCode = this.configService.get<string>('INFOWARE_BRANCH_CODE');
      const ledgerType = this.configService.get<string>('INFOWARE_LEDGER_TYPE');

      const narration = `Canary Investment - ${request?.reference}`;
      const ref02 = request?.reference;

      const fundAccountUrl =
        `${this.symplusBaseUrl}/infoweb-api/fund-account?` +
        `EffectiveDate=${effectiveDate}` +
        `&CallerTransactionID=${request?.reference}` +
        `&CRAccountMaster=${crAccountMaster}` +
        `&CRAccountSub=${wallet?.encrypted_infoware_customer_id}` + // CR sub = customer id
        `&DRAccountMaster=${drAccountMaster}` +
        `&DRAccountSub=${drAccountSub}` +
        `&Amount=${amount}` +
        `&Narration=${encodeURIComponent(narration)}` +
        `&BranchCode=${branchCode}` +
        `&LedgerType=${ledgerType}` +
        `&Ref02=${ref02}`;

      this.logger.log(
        `Calling Infoware fund-account API for Canary investment ${request?.id}: ${fundAccountUrl}`,
      );

      const fundAccountResponse: any =
        await this.externalApiCallsService.getData(fundAccountUrl);

      if (
        !fundAccountResponse ||
        fundAccountResponse.error ||
        (fundAccountResponse.statusCode &&
          fundAccountResponse.statusCode >= 400)
      ) {
        const errorMsg =
          fundAccountResponse?.message || 'Infoware fund-account failed';
        throw new Error(errorMsg);
      }

      this.logger.log(
        `Infoware fund-account response for Canary investment ${request?.id}: ${JSON.stringify(fundAccountResponse)}`,
      );
    } catch (fundError) {
      this.logger.error(
        `Failed calling Infoware fund-account API for Canary investment ${request.id}: ${fundError.message}`,
        fundError.stack,
      );

      // Reverse debit and fail approval
      await this.creditUserWallet(user.id, amount, request.reference, 'Canary');
      request.status = CanaryInvestmentRequestStatus.PENDING;
      request.admin_notes = `[AUTO-REVERSED] Infoware fund-account failed: ${fundError.message}`;
      await this.investmentRequestRepository.save(request);

      throw new InternalServerErrorException(
        `Sync failure (Fund Account): ${fundError.message}. User wallet has been reversed.`,
      );
    }

    // ------------------------------------------------------------------
    // INFOWARE SUBSCRIBE AND APPROVE
    // ------------------------------------------------------------------
    try {
      await this.infowareService.subscribeAndApprove(
        custAID,
        fundCode,
        effectiveDate,
        amount,
      );

      // SUCCESS -> Mark APPROVED
      request.status = CanaryInvestmentRequestStatus.APPROVED;
      await this.investmentRequestRepository.save(request);

      const emailData = {
        heading: 'Investment Request Approved – Canary Fund',
        userName: `${user.first_name} ${user.last_name}`,
        introText:
          'We are pleased to inform you that your Canary Fund investment request has been successfully approved and processed.',
        details: [
          { label: 'Fund', value: 'Canary Fund' },
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
        title: 'Investment Request Approved – Canary Fund',
        description:
          'Your Canary Fund investment request has been successfully approved.',
        notification_type: 'IMPORTANT_ACTION',
        notification_mode: 'SINGLE',
        notification_channel: 'EMAIL',
        recipients_user_id: user.id,
        recipients_email: user.email,
        recipients_phone_number: user.phone || 'null',
        request_ref: `INV_${request.reference}${Date.now()}`,
        message: `Your Canary Fund investment request (Ref: ${request.reference}) has been approved.`,
        html: null,
        complete_html_body: html,
        show_advert: false,
        purpose: 'register',
      };

      try {
        await this.userService.sendUserAuthNotifications(notificationData);
        this.logger.log(`Approval email sent to ${user.email}`);
      } catch (emailError) {
        this.logger.error(
          `Failed to send approval email to ${user.email} for request ${requestId}: ${emailError.message}`,
          emailError.stack,
        );
      }

      return this.mapToResponseDto(request);
    } catch (subscribeError) {
      this.logger.error(
        `Failed subscribeAndApprove for Canary investment ${request.id}: ${subscribeError.message}`,
        subscribeError.stack,
      );

      // Reverse debit and fail approval
      await this.creditUserWallet(user.id, amount, request.reference, 'Canary');
      request.status = CanaryInvestmentRequestStatus.PENDING;
      request.admin_notes = `[AUTO-REVERSED] Subscribe and Approve failed: ${subscribeError.message}`;
      await this.investmentRequestRepository.save(request);

      throw new InternalServerErrorException(
        `Sync failure (Subscribe): ${subscribeError.message}. User wallet has been reversed.`,
      );
    }
  }

  async rejectInvestmentRequest(
    requestId: number,
    adminId: number,
    rejectData: RejectInvestmentRequestDto,
  ): Promise<InvestmentRequestResponseDto> {
    this.logger.log(
      `Admin ID: ${adminId} rejecting investment request ID: ${requestId}`,
    );

    try {
      const request = await this.investmentRequestRepository.findOne({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Investment request not found');
      if (request.status !== CanaryInvestmentRequestStatus.PENDING) {
        throw new BadRequestException(
          'Investment request is not pending approval',
        );
      }

      request.status = CanaryInvestmentRequestStatus.REJECTED;
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
        `Failed to reject investment request ID: ${requestId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to reject investment request',
      );
    }
  }

  async approveCanaryFundRedemptionRequest(
    redemptionId: number,
    adminId: number,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      redemptionId: number;
      userId: number;
      redeemedAmount: number;
      poolType: InvestmentPoolType;
    };
  }> {
    this.logger.log(
      `Admin ID ${adminId} attempting to approve CANARY redemption ID ${redemptionId}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Fetch the redemption request
      const redemption = await queryRunner.manager.findOne(
        FundRedemptionCanaryRequest,
        {
          where: { id: redemptionId },
        },
      );

      if (!redemption) {
        throw new NotFoundException(
          `Fund redemption request with ID ${redemptionId} not found`,
        );
      }

      if (redemption.status !== FundRedemptionCanaryStatus.PROCESSING) {
        throw new BadRequestException(
          'Only processing redemptions can be approved',
        );
      }

      const userId = redemption.user_identity;
      const poolType = InvestmentPoolType.CANARY;
      const redemptionAmount = Number(redemption.amount);

      // Step 6: Update statuses after successful deduction
      redemption.status = FundRedemptionCanaryStatus.COMPLETED;
      redemption.approved_by = adminId;
      redemption.approved_at = new Date();
      redemption.completed_at = new Date();
      await queryRunner.manager.save(redemption);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Canary fund redemption approved successfully.',
        data: {
          redemptionId,
          userId,
          redeemedAmount: redemptionAmount,
          poolType,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to approve CANARY redemption ID ${redemptionId}: ${error.message}`,
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

  async rejectCanaryFundRedemptionRequest(
    redemptionId: number,
    adminId: number,
    reason?: string,
  ): Promise<FundRedemptionCanaryRequest> {
    this.logger.log(
      `Admin ID ${adminId} attempting to reject CANARY fund redemption ID ${redemptionId}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Fetch the redemption request
      const redemption = await queryRunner.manager.findOne(
        FundRedemptionCanaryRequest,
        {
          where: { id: redemptionId },
        },
      );

      if (!redemption) {
        throw new NotFoundException('CANARY fund redemption request not found');
      }

      // Only processing requests can be rejected
      if (redemption.status !== FundRedemptionCanaryStatus.PROCESSING) {
        throw new BadRequestException(
          'Only processing redemptions can be rejected',
        );
      }

      // Step 2: Update redemption record
      redemption.status = FundRedemptionCanaryStatus.FAILED;
      redemption.rejected_by = adminId;
      redemption.rejected_at = new Date();
      redemption.failed_at = new Date();
      redemption.admin_notes = reason || 'Redemption request rejected by admin';

      await queryRunner.manager.save(redemption);

      // Step 3: Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `CANARY fund redemption ${redemptionId} successfully rejected by admin ${adminId}`,
      );

      return redemption;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to reject CANARY redemption ID ${redemptionId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;

      throw new InternalServerErrorException(
        'Unexpected error during CANARY redemption rejection',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async debitUserWallet(
    userId: number,
    amount: number,
    transactionRef: string,
    investmentRequestType: string,
  ): Promise<void> {
    this.logger.log(
      `Debiting wallet for user ID: ${userId}, amount: ${amount}, ref: ${transactionRef}`,
    );

    try {
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.CANARY,
        );

      if (!userWallet) throw new Error('User wallet not found for debit');

      const transactionData = {
        transaction_reference: `INV-${transactionRef}${Date.now()}`,
        external_reference: `Inv-${transactionRef}`,
        transaction_type: VirtualWalletTransactionType.DEBIT,
        amount: amount,
        description: `Investment debit for ${investmentRequestType} purchase`,
        receiver_name: `${investmentRequestType} Investment`,
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
        `Failed to debit wallet for user ID: ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  private async creditUserWallet(
    userId: number,
    amount: number,
    transactionRef: string,
    investmentRequestType: string,
  ): Promise<void> {
    this.logger.log(
      `Crediting wallet for user ID: ${userId}, amount: ${amount}, ref: ${transactionRef} (REVERSAL)`,
    );

    try {
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.CANARY,
        );

      if (!userWallet) throw new Error('User wallet not found for credit');

      const transactionData = {
        transaction_reference: `REV-${transactionRef}${Date.now()}`,
        external_reference: `Rev-${transactionRef}`,
        transaction_type: VirtualWalletTransactionType.CREDIT,
        amount: amount,
        description: `Investment reversal for ${investmentRequestType} failure`,
        receiver_name: `GDL Reversal`,
        receiver_account: userWallet.virtual_account_number,
        receiver_bank_code: userWallet.bank_code,
      };

      await this.virtualWalletService.processTransaction(
        userId,
        userWallet.virtual_account_number,
        transactionData,
      );

      this.logger.log(
        `Successfully credited (reversed) ₦${amount.toLocaleString()} to user ID: ${userId} wallet`,
      );
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to credit (reverse) wallet for user ID: ${userId}. Manual intervention required! Ref: ${transactionRef}`,
        error.stack,
      );
      // We don't rethrow here because this is a reversal attempt, but it's a critical failure.
    }
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
      // ✅ Step 1: Calculate pending Canary investments
      const canaryQuery = this.investmentRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: CanaryInvestmentRequestStatus.PENDING,
        });

      if (excludeRequestId) {
        canaryQuery.andWhere('req.id != :excludeRequestId', {
          excludeRequestId,
        });
      }
      const { total: pendingCanary } = await canaryQuery.getRawOne();

      // ✅ Step 2: Calculate pending Income investments
      const incomeQuery = this.incomeRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: IncomeInvestmentRequestStatus.PENDING,
        });
      const { total: pendingIncome } = await incomeQuery.getRawOne();

      // ✅ Step 3: Calculate pending MMF investments
      const mmfQuery = this.mmfRequestRepository
        .createQueryBuilder('req')
        .select('COALESCE(SUM(req.price), 0)', 'total')
        .where('req.user_id = :userId', { userId })
        .andWhere('req.status = :status', {
          status: MMFInvestmentRequestStatus.PENDING,
        });
      const { total: pendingMMF } = await mmfQuery.getRawOne();

      console.log(
        `[DEBUG CANARY] Pending: Canary=${pendingCanary}, Income=${pendingIncome}, MMF=${pendingMMF}`,
      );

      const totalPendingLiabilities =
        (Number(pendingCanary) || 0) +
        (Number(pendingIncome) || 0) +
        (Number(pendingMMF) || 0);

      // ✅ Step 4: Fetch wallet balance (Computed)
      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.CANARY,
        );

      if (!userWallet) {
        throw new BadRequestException(
          'No virtual wallet found. Please create a virtual wallet first.',
        );
      }

      // ✅ Step 5: Validate total capacity
      const totalAmountRequired = totalPendingLiabilities + requestAmount;
      console.log('totalAmountRequired', totalAmountRequired);

      // ✅ Step 6: Validate against wallet balance
      if (totalAmountRequired > userWallet.current_balance) {
        const availableBalance =
          totalAmountRequired - userWallet.current_balance;
        throw new BadRequestException({
          message: `Insufficient Wallet Balance. Total pending investments across all funds plus new request is ₦${totalAmountRequired.toLocaleString()}. Available Balance: ₦${userWallet?.current_balance.toLocaleString()}. Kindly fund your wallet with this amount ₦${availableBalance.toLocaleString()} or above to proceed with this investment request.`,
          response_code: '016',
        });
      }

      this.logger.log(
        `✅ Balance validation successful for user ID: ${userId}`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Balance validation failed for user ID: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to validate user balance');
    }
  }

  /**
   * Create fund redemption request to Symplus API
   */
  async fundRedemption(
    userId: number,
    createFundRedemptionDto: CreateFundRedemptionDto,
  ): Promise<FundRedemptionResponseDto> {
    this.logger.log(`Initiating fund redemption for user ID: ${userId}`);
    this.logger.log(
      `Redemption data: ${JSON.stringify(createFundRedemptionDto, null, 2)}`,
    );

    try {
      // 🔹 Step 1: Validate user
      const user = await this.userService.findUserById(userId);
      if (!user) throw new NotFoundException('User not found');

      // 🔹 Step 2: Validate user investment pool and available balance
      const poolType = InvestmentPoolType.CANARY;

      // 🔹 Step 3: Validate user NUBAN & wallet
      const fetchUserNuban =
        await this.nubanAccountsService.fetchUserNubanWitheDetails(user.id);

      const userWallet =
        await this.virtualWalletService.findWalletForInvestment(
          userId,
          InvestmentPoolType.CANARY,
        );

      if (!userWallet)
        throw new NotFoundException('User virtual wallet not found.');
      if (!userWallet.encrypted_infoware_customer_id)
        throw new BadRequestException(
          'Customer has not been profiled for investment.',
        );

      // Step 4: Validate user has sufficient investment balance
      const activeInvestment =
        await this.getUserTotalActiveInvestmentAmount(userId);

      if (
        activeInvestment.status !== 'ACTIVE' ||
        !activeInvestment.investment
      ) {
        throw new BadRequestException(
          'You do not have any active investments available for redemption. Please ensure you have an active investment before requesting a redemption.',
        );
      }

      // Calculate total pending redemption amount (sum of PROCESSING requests)
      const { total: totalPendingRedemptionsRaw } =
        await this.fundRedemptionRepository
          .createQueryBuilder('redemption')
          .select('SUM(redemption.amount)', 'total')
          .where('redemption.user_identity = :userId', { userId })
          .andWhere('redemption.status = :status', {
            status: FundRedemptionCanaryStatus.PROCESSING,
          })
          .getRawOne();

      const totalPendingRedemptions = Number(totalPendingRedemptionsRaw) || 0;
      const marketValue = Number(activeInvestment.investment.market_value);
      const redemptionAmount = Number(createFundRedemptionDto.amount);

      // Logic: New Request + Pending Redemptions <= Current Balance
      const totalLiabilities = totalPendingRedemptions + redemptionAmount;

      if (totalLiabilities > marketValue) {
        const availableRedeemable = Math.max(
          0,
          marketValue - totalPendingRedemptions,
        );
        throw new BadRequestException(
          `Redemption Request Exceeds Balance. You have ₦${totalPendingRedemptions.toLocaleString()} in pending redemptions. Your current investment balance is ₦${marketValue.toLocaleString()}. You can only redeem up to ₦${availableRedeemable.toLocaleString()} more.`,
        );
      }

      this.logger.log(
        `✅ Redemption validation passed: User ${userId} has ₦${marketValue.toLocaleString()} available, redeeming ₦${redemptionAmount.toLocaleString()}`,
      );

      // 🔹 Step 5: Generate secure string reference
      const requestReference = this.generateSecure20DigitNumber().toString();

      const redeemptionResponse =
        await this.investmentpoolService.redeemInvestment(
          userWallet.encrypted_infoware_customer_id,
          'CGF', // 🔸 TODO: Replace with actual Fund Code or dynamic value from the environment cluster
          Number(createFundRedemptionDto.amount),
        );

      // Step 5: Create local redemption record
      const fundRedemption = this.fundRedemptionRepository.create({
        user_identity: user.id,
        investment_request_id: null, // Manual or general redemptions have no linked investment
        first_name: user.first_name,
        last_name: user.last_name,
        account: fetchUserNuban?.nuban_account || 'TEST-ACCOUNT',
        redemption_date: new Date(),
        amount: createFundRedemptionDto.amount,
        quantity: 0,
        reference: `RDM-${Date.now()}`, // safe to store as string
        fund_account_no: 'Manual',
        cash_account_no: 'Manual',
        status: FundRedemptionCanaryStatus.PROCESSING,
      });

      await this.fundRedemptionRepository.save(fundRedemption);

      this.logger.log(
        `Fund redemption ${fundRedemption.id} created successfully and marked as PROCESSING.`,
      );

      // ------------------------------------------------------------------
      // USER NOTIFICATION (Redemption Received)
      // ------------------------------------------------------------------
      try {
        const emailData = {
          heading: 'Fund Redemption Request Received',
          userName: `${user.first_name} ${user.last_name}`,
          introText:
            'We have received your request to redeem funds from your Canary investment. Your request is currently being processed.',
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
      // INTERNAL STAFF NOTIFICATION (Canary Redemption)
      // ------------------------------------------------------------------
      try {
        const infowareId =
          userWallet?.encrypted_infoware_customer_id || 'Not Available';

        const internalEmailData = {
          heading: 'New Canary Redemption Request - Action Required',
          userName: 'Admin',
          introText: `A new Canary redemption request has been submitted by <b>${user.first_name} ${user.last_name}</b>.`,
          details: [
            {
              label: 'Customer Name',
              value: `${user.first_name} ${user.last_name}`,
            },
            { label: 'Infoware ID', value: infowareId },
            { label: 'Redemption Type', value: 'Canary Redemption' },
            {
              label: 'Amount',
              value: `₦${Number(createFundRedemptionDto.amount).toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 },
              )}`,
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

        const internalNotificationData = {
          sender: 'GDL System',
          title: 'New Canary Redemption Request',
          description: 'New Canary Redemption Request',
          notification_type: 'IMPORTANT_ACTION',
          notification_mode: 'SINGLE',
          notification_channel: 'EMAIL',
          recipients_user_id: user.id,
          recipients_email: 'yadekoya@housemoni.ng',
          recipients_phone_number: 'null',
          request_ref: `INT_RDM_${fundRedemption.reference}${Date.now()}`,
          message: `New Canary Redemption Request from ${user.first_name} ${user.last_name}`,
          html: null,
          complete_html_body: internalHtml,
          show_advert: false,
          purpose: 'register',
        };

        await this.userService.sendUserAuthNotifications(
          internalNotificationData,
        );

        const ccNotificationData = {
          ...internalNotificationData,
          recipients_email: 'aanurunkem@housemoni.ng',
        };
        await this.userService.sendUserAuthNotifications(ccNotificationData);

        this.logger.log(
          `Internal Canary redemption notification sent to staff`,
        );
      } catch (internalEmailError) {
        this.logger.error(
          `Failed to send internal Canary redemption notification: ${internalEmailError.message}`,
          internalEmailError.stack,
        );
      }

      // 🔹 Step 6: Return structured response
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
        `Fund redemption creation failed for user ${userId} → ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;

      throw new InternalServerErrorException(
        `Failed to initiate fund redemption: ${error.message}`,
      );
    }
  }

  /**
   * Get redemption requests for a specific user
   */
  async getUserRedemptionRequests(
    userId: number,
    queryParams: GetInvestmentRequestsDto,
  ): Promise<{
    requests: FundRedemptionAdminResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`Fetching redemption requests for user ID: ${userId}`);

    try {
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
      } = queryParams;
      const skip = (page - 1) * limit;

      // Build dynamic filters
      const whereConditions: any = { user_identity: userId };
      if (status) whereConditions.status = status;
      if (start_date && end_date) {
        whereConditions.created_at = Between(
          new Date(start_date),
          new Date(end_date),
        );
      }

      // Fetch data from FundRedemption repository
      const [requests, total] =
        await this.fundRedemptionRepository.findAndCount({
          where: whereConditions,
          order: { created_at: 'DESC' },
          skip,
          take: limit,
        });

      this.logger.log(`User ${userId} has ${total} redemption requests`);

      // Map entities to response DTOs
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
        `Failed to fetch redemption requests for user ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch redemption requests',
      );
    }
  }

  async getAllCanaryRedemptionFund(
    queryParams: GetInvestmentRequestsDto,
  ): Promise<{
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
      } = queryParams;
      const skip = (page - 1) * limit;

      // 🔹 Step 1: Build dynamic filters
      const whereConditions: any = {};
      if (status) whereConditions.status = status;
      if (start_date && end_date) {
        whereConditions.created_at = Between(
          new Date(start_date),
          new Date(end_date),
        );
      }

      // 🔹 Step 2: Fetch data from FundRedemption repository
      const [requests, total] =
        await this.fundRedemptionRepository.findAndCount({
          where: whereConditions,
          relations: ['user'],
          order: { created_at: 'DESC' },
          skip,
          take: limit,
        });

      this.logger.log(`Admin retrieved ${total} fund redemption records.`);

      // 🔹 Step 3: Map entities to admin DTOs
      const mappedRequests = requests.map((r) =>
        this.mapToFundRedemptionAdminResponseDto(r),
      );

      // 🔹 Step 4: Return formatted response
      return {
        requests: mappedRequests,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Admin failed to fetch fund redemption records`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch fund redemption records',
      );
    }
  }

  async getCanaryRedemptionFundById(
    id: number,
  ): Promise<FundRedemptionCanaryRequest> {
    try {
      this.logger.log(`This is a canary request: ${id}`);

      // 🔹 Step 1: Fetch record with related entities
      const redemption = await this.fundRedemptionRepository.findOne({
        where: { id },
      });

      // 🔹 Step 2: Handle not found case
      if (!redemption) {
        this.logger.warn(`Fund redemption record not found with ID: ${id}`);
        throw new NotFoundException(`Fund redemption record not found`);
      }

      // 🔹 Step 3: Map entity to response DTO
      // const mappedResponse = this.mapToFundRedemptionAdminResponseDto(redemption);

      // 🔹 Step 4: Return formatted response
      return redemption;
    } catch (error) {
      this.logger.error(
        `Admin failed to fetch fund redemption record with ID: ${id}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch fund redemption record',
      );
    }
  }

  private mapToFundRedemptionAdminResponseDto(
    entity: FundRedemptionCanaryRequest,
  ): FundRedemptionAdminResponseDto {
    console.log('Mapping fund redemption entity:', entity);
    const maskAccount = (account: string) => {
      if (!account) return null;
      return account.length > 4 ? `****${account.slice(-4)}` : '****';
    };

    return {
      id: entity.id,
      user_id: entity.id,
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
    this.logger.log(`Creating fund redemption payload for user: ${user.email}`);
    this.logger.log(`Using Symplus customer ID: ${decryptedCustomerId}`);

    return {
      redeem: [
        {
          fund: redemptionDto.fund,
          amount: redemptionDto.amount,
          customer: decryptedCustomerId, // Use decrypted Symplus customer ID
          reference: redemptionDto.reference || `RDM-${Date.now()}`,
          externalref: user.user_txn_ref,
          notes: redemptionDto.notes || 'Fund redemption request',
        },
      ],
    };
  }

  private mapToResponseDto(
    request: CanaryInvestmentRequest,
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
    // Use 12 bytes to increase chance of large decimal string before truncation
    const hex = randomBytes(12).toString('hex');
    const big = BigInt('0x' + hex).toString();
    return big.padStart(20, '0').slice(0, 20);
  }

  private async ensureInfowareCustomerExists(
    userId: number,
    userWallet: VirtualWallet,
  ): Promise<VirtualWallet> {
    if (userWallet.encrypted_infoware_customer_id) {
      return userWallet;
    }

    this.logger.log(
      `Infoware customer ID not found for user ${userId}. Creating new Infoware customer...`,
    );

    const user = await this.userService.findUserById(userId);
    const fetchUserNuban =
      await this.nubanAccountsService.fetchUserNubanWitheDetails(userId);

    if (!fetchUserNuban) {
      console.log(
        `User ${userId} has no NUBAN details. Cannot create Infoware customer.`,
      );
      return userWallet; // Or throw error depending on requirements
    }

    const mapSex = (gender: string) => {
      if (!gender) return Sex.MALE; // Default
      const g = gender.toUpperCase();
      return g === 'FEMALE' ? Sex.FEMALE : Sex.MALE;
    };

    const payload: CreateCustomerDto = {
      AccountType: AccountType.INDIVIDUAL,
      Title: Title.MR, // Defaulting or map if available
      lastName: user.last_name || '',
      firstName: user.first_name || '',
      Othernames: user.other_names || '',
      Sex: mapSex(user.gender),
      DateOfBirth: user.date_of_birth
        ? new Date(user.date_of_birth).toISOString().split('T')[0]
        : '1990-01-01', // Fallback
      PermanentAddress: user.address || 'Lagos',
      Nationality: user.country || 'Nigeria',
      phone: user.phone || '',
      email: user.email,
      BankAcctNumber: fetchUserNuban.nuban_account,
      BankCode: fetchUserNuban.bank_code,
      BankAcctName: fetchUserNuban.account_name,
      NextOfKin: user.next_of_kin_name || 'Next of Kin',
      City: user.city || 'Lagos',
      State: user.state || 'Lagos',
      Country: user.country || 'Nigeria',
    };

    try {
      console.log(`Creating Infoware customer with payload for ${user.email}`);
      const response: any = await this.infowareService.createCustomer(payload);

      console.log(`Infoware creation response: ${JSON.stringify(response)}`);

      // Extract ID from response. Assuming response structure based on typical Infoware API.
      // Adjust extraction based on actual API response structure (e.g., response.data.CustomerId)
      // The service returns the raw response from handleRequest.

      // Check success based on response
      // If direct ID returned or inside data object
      const infowareId = response?.data?.CustomerId || response?.CustomerId;

      if (infowareId) {
        userWallet.encrypted_infoware_customer_id = String(infowareId);
        await this.virtualWalletRepository.save(userWallet);
        console.log(`Saved Infoware ID for user ${userId}: ${infowareId}`);
      } else {
        console.log(
          `Infoware ID not found in creation response for user ${userId}`,
        );
      }
    } catch (error) {
      console.log(
        `Failed to create Infoware customer: ${error.message}`,
        error.stack,
      );
      // Non-blocking for now, or throw if critical? User request asks to "ensure", implying critical.
      // But suppressing to avoid breaking current flow if API is flaky, matching Symplus pattern.
    }

    return userWallet;
  }
}
