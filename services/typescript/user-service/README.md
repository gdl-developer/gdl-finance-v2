import {
Injectable,
Logger,
NotFoundException,
BadRequestException,
InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Connection } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

import {
IncomeInvestmentRequest,
IncomeInvestmentRequestStatus,
} from './entities/investment-request-income.entity';
import { VirtualWallet, VirtualWalletTransactionType } from '../virtual-account/entities/virtual-wallet.entity';
import { VirtualWalletService } from '../virtual-account/virtual-wallet.service';
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
import { FundRedemptionIncomeRequest, FundRedemptionIncomeStatus } from './entities/redemption-income-request.entity';
import { FundRedemptionAdminResponseDto } from '../investment-request/dto/investment-request.dto';
import { InvestmentPoolService } from '../investment-pull/investment-pull.service';
import { InvestmentPoolStatus, InvestmentPoolType } from '../investment-pull/entities/investment-pull.entity';

@Injectable()
export class InvestmentRequestIncomeService {
private readonly logger = new Logger(InvestmentRequestIncomeService.name);
private readonly symplusBaseUrl: string;
private readonly symplusFundAccountUrl: string;

constructor(
@InjectRepository(IncomeInvestmentRequest)
private readonly investmentRequestRepository: Repository<IncomeInvestmentRequest>,
@InjectRepository(VirtualWallet)
private readonly virtualWalletRepository: Repository<VirtualWallet>,
@InjectRepository(FundRedemptionIncomeRequest)
private readonly fundRedemptionRepository: Repository<FundRedemptionIncomeRequest>,
private readonly virtualWalletService: VirtualWalletService,
private readonly externalApiCallsService: ExternalApiCallsService,
private readonly userService: UserService,
private readonly configService: ConfigService,
private readonly symplusService: SymplusService,
private readonly nubanAccountsService: NubanAccountsService,
private readonly dataSource: Connection,
private readonly investmentpoolService: InvestmentPoolService,
) {
this.symplusBaseUrl = this.configService.get<string>('SYMPLUS_BASE_URL') || '';
if (!this.symplusBaseUrl) {
throw new Error('SYMPLUS_BASE_URL is not defined in environment variables');
}

    this.symplusFundAccountUrl = `${this.symplusBaseUrl}/symplus/api/requests/fund-account`;
    this.logger.log(
      `Initialized InvestmentRequestIncomeService with Symplus Base URL: ${this.symplusBaseUrl}`,
    );

}

/\*_ ---------------- Symplus Fund Accounts ---------------- _/

async getUserFundAccounts(userId: number): Promise<any> {
this.logger.log(`Fetching Symplus fund accounts for user ID: ${userId}`);

    const userWallet = await this.virtualWalletRepository.findOne({
      where: { user_id: userId, is_primary: true },
    });

    if (!userWallet?.encrypted_symplus_customer_id) {
      throw new BadRequestException(
        'Symplus customer ID not found. Please ensure your account is fully set up.',
      );
    }

    const decryptedCustomerId = await this.symplusService.getDecryptedCustomerId(
      userWallet.id,
    );

    if (!decryptedCustomerId) {
      throw new InternalServerErrorException(
        'Failed to retrieve customer ID for fund accounts',
      );
    }

    const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${decryptedCustomerId}`;
    this.logger.log(`Fetching fund accounts from: ${url}`);

    const response = await this.externalApiCallsService.getData(url);

    if (!response || response.error || response.statusCode >= 400) {
      throw new InternalServerErrorException(
        response?.message || 'Failed to fetch fund accounts from Symplus',
      );
    }

    return response;

}

async getCustomerFundAccounts(customerId: string): Promise<any> {
const url = `${this.symplusBaseUrl}/symplus/api/requests/get-fund-accounts/${customerId}`;
const response = await this.externalApiCallsService.getData(url);

    if (!response || response.error || response.statusCode >= 400) {
      throw new InternalServerErrorException(
        response?.message || 'Failed to fetch fund accounts from Symplus',
      );
    }

    return response;

}

/\*_ ---------------- Investment Requests ---------------- _/

async createInvestmentRequest(
userId: number,
createInvestmentRequestDto: CreateInvestmentRequestDto,
): Promise<InvestmentRequestResponseDto> {
this.logger.log(`Creating investment request for user ID: ${userId}`);
const referenceId = `GDL-${Date.now()}-${userId}`;

    try {
      const existing = await this.investmentRequestRepository.findOne({
        where: { reference: referenceId },
      });
      if (existing) throw new BadRequestException('Investment request with this reference already exists');

      const user = await this.userService.findUserById(userId);
      const price = Number(createInvestmentRequestDto.price);
      const quantity = Number(createInvestmentRequestDto.quantity);
      const amount = price;

      if (isNaN(amount) || amount <= 0) throw new BadRequestException('Invalid amount');

      await this.validateUserBalance(userId, amount);
      await this.validatePendingInvestments(userId, amount);

      const wallet = await this.virtualWalletRepository.findOne({
        where: { user_id: userId, is_primary: true },
      });

      const request = this.investmentRequestRepository.create({
        user_id: userId,
        first_name: user.first_name,
        last_name: user.last_name,
        account: wallet.virtual_account_number,
        date: new Date(),
        price: createInvestmentRequestDto.price,
        quantity: createInvestmentRequestDto.quantity,
        reference: referenceId,
        status: IncomeInvestmentRequestStatus.PENDING,
      });

      const saved = await this.investmentRequestRepository.save(request);
      this.logger.log(`Investment request created successfully with ID: ${saved.id}`);

      return this.mapToResponseDto(saved);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to create investment request: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create investment request');
    }

}

async getUserInvestmentRequests(
userId: number,
queryParams: GetInvestmentRequestsDto,
): Promise<{ requests: InvestmentRequestResponseDto[]; total: number; page: number; limit: number }> {
this.logger.log(`Fetching investment requests for user ID: ${userId}`);

    const { page = 1, limit = 20, status, start_date, end_date } = queryParams;
    const skip = (page - 1) * limit;

    const whereConditions: any = { user_id: userId };
    if (status) whereConditions.status = status;
    if (start_date && end_date) {
      whereConditions.created_at = Between(new Date(start_date), new Date(end_date));
    }

    const [requests, total] = await this.investmentRequestRepository.findAndCount({
      where: whereConditions,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      requests: requests.map((r) => this.mapToResponseDto(r)),
      total,
      page,
      limit,
    };

}

async getInvestmentRequestById(
userId: number,
requestId: number,
): Promise<InvestmentRequestResponseDto> {
const request = await this.investmentRequestRepository.findOne({ where: { id: requestId } });
if (!request) throw new NotFoundException('Investment request not found');
return this.mapToResponseDto(request);
}

async updateInvestmentRequest(
userId: number,
requestId: number,
updateData: UpdateInvestmentRequestDto,
): Promise<InvestmentRequestResponseDto> {
const request = await this.investmentRequestRepository.findOne({
where: { id: requestId, user_id: userId },
});

    if (!request) throw new NotFoundException('Investment request not found');
    if (request.status !== IncomeInvestmentRequestStatus.PENDING) {
      throw new BadRequestException('Cannot update non-pending request');
    }

    if (updateData.price || updateData.quantity) {
      const newAmount = Number(updateData.price ?? request.price) * Number(updateData.quantity ?? request.quantity);
      await this.validateUserBalance(userId, newAmount);
      await this.validatePendingInvestments(userId, newAmount, requestId);
    }

    Object.assign(request, updateData);
    const updated = await this.investmentRequestRepository.save(request);

    return this.mapToResponseDto(updated);

}

/\*_ ---------------- Fund Redemptions ---------------- _/

async fundRedemption(
userId: number,
createFundRedemptionDto: CreateFundRedemptionDto,
): Promise<FundRedemptionResponseDto> {
this.logger.log(`Initiating fund redemption for user ID: ${userId}`);

    const user = await this.userService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const poolType = InvestmentPoolType.INCOME;
    const pool = await this.investmentpoolService.getUserInvestmentPoolByType(userId, poolType);

    const redemptionAmount = Number(createFundRedemptionDto.amount);
    if (!Number.isFinite(redemptionAmount) || redemptionAmount <= 0) {
      throw new BadRequestException('Invalid redemption amount.');
    }

    const currentBalance = Number(pool.current_balance ?? 0);
    if (redemptionAmount > currentBalance) {
      throw new BadRequestException(
        `Insufficient pool balance. Available: ₦${currentBalance}, requested: ₦${redemptionAmount}`,
      );
    }

    const fetchUserNuban = await this.nubanAccountsService.fetchUserNubanWitheDetails(user.id);
    const userWallet = await this.virtualWalletRepository.findOne({ where: { user_id: userId, is_primary: true } });
    if (!userWallet) throw new NotFoundException('User virtual wallet not found');

    const requestReference = this.generateSecure20DigitNumber();

    const fundRedemption = this.fundRedemptionRepository.create({
      user_identity: user.id,
      investment_request_id: null,
      first_name: user.first_name,
      last_name: user.last_name,
      account: fetchUserNuban?.nuban_account || 'TEST-ACCOUNT',
      redemption_date: new Date(),
      amount: redemptionAmount,
      reference: requestReference,
      fund_account_no: 'Manual',
      cash_account_no: 'Manual',
      status: FundRedemptionIncomeStatus.PROCESSING,
    });

    await this.fundRedemptionRepository.save(fundRedemption);

    // Prepare payload for Symplus
    const payload = this.createFundRedemptionPayload(user, createFundRedemptionDto, userWallet, userWallet.encrypted_symplus_customer_id);

    // Call Symplus API dynamically using base URL
    const symplusResponse = await this.externalApiCallsService.postData(this.symplusFundAccountUrl, payload);

    return {
      success: true,
      message: 'Fund redemption request created successfully.',
      data: {
        pool_type: poolType,
        redemption_amount: redemptionAmount,
        available_balance: currentBalance,
        pool_status: pool.status,
        symplus_response: symplusResponse,
      },
      reference: fundRedemption.reference,
      status: fundRedemption.status,
      created_at: fundRedemption.created_at,
    };

}

/\*_ ---------------- Helper Methods ---------------- _/

private async validateUserBalance(userId: number, requestAmount: number): Promise<void> {
const wallet = await this.virtualWalletRepository.findOne({ where: { user_id: userId, is_primary: true } });
if (!wallet) throw new BadRequestException('No virtual wallet found');

    if (wallet.current_balance < requestAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ₦${requestAmount.toLocaleString()}, Available: ₦${wallet.current_balance.toLocaleString()}`,
      );
    }

}

private async validatePendingInvestments(userId: number, newRequestAmount: number, excludeRequestId?: number): Promise<void> {
const { totalPendingAmount } = await this.investmentRequestRepository
.createQueryBuilder('req')
.select('COALESCE(SUM(req.price), 0)', 'totalPendingAmount')
.where('req.user_id = :userId', { userId })
.andWhere('req.status = :status', { status: IncomeInvestmentRequestStatus.PENDING })
.andWhere(excludeRequestId ? 'req.id != :excludeRequestId' : '1=1', { excludeRequestId })
.getRawOne();

    const pendingAmount = Number(totalPendingAmount) || 0;
    const wallet = await this.virtualWalletRepository.findOne({ select: ['current_balance'], where: { user_id: userId, is_primary: true } });
    const totalAfterNewRequest = pendingAmount + newRequestAmount;

    if (totalAfterNewRequest > wallet.current_balance) {
      const availableBalance = wallet.current_balance - pendingAmount;
      throw new BadRequestException(`Insufficient available balance. You only have ₦${availableBalance.toLocaleString()} available for new investments.`);
    }

}

private mapToResponseDto(request: IncomeInvestmentRequest): InvestmentRequestResponseDto {
const amount = Number(request.price) \* Number(request.quantity);
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

private createFundRedemptionPayload(user: any, redemptionDto: CreateFundRedemptionDto, userWallet: VirtualWallet, decryptedCustomerId: string) {
return {
redeem: [
{
fund: redemptionDto.fund,
account: redemptionDto.account,
amount: redemptionDto.amount,
customer: decryptedCustomerId,
reference: redemptionDto.reference || `RDM-${Date.now()}`,
externalref: user.user_txn_ref,
notes: redemptionDto.notes || 'Fund redemption request',
},
],
};
}

generateSecure20DigitNumber(): string {
const hex = randomBytes(12).toString('hex');
const big = BigInt('0x' + hex).toString();
return big.padStart(20, '0').slice(0, 20);
}
}
