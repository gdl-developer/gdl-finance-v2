import {
  Injectable,
  HttpException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import {
  CreateCustomerDto,
  FundAccountDto,
  InfowebValuationResponse,
} from './dto/create-customer.dto';

@Injectable()
export class InfowareService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InfowareService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SYMPLUS_SERVICE_BASE_URL');
  }

  /**
   * Generic HTTP request handler
   */
  /**
   * Generic HTTP request handler
   */
  private async handleRequest<T>(
    method: 'get' | 'post',
    endpoint: string,
    data?: any,
    params?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      let response;
      if (method === 'post') {
        response = await this.externalApiCallsService.postData(url, data);
      } else {
        response = await this.externalApiCallsService.getData(
          url,
          undefined,
          params,
        );
      }

      return response as T;
    } catch (error: any) {
      const axiosError = error;
      const status = axiosError?.response?.status || 502;
      const rawResponse = axiosError?.response?.data;

      const cleanedMessage =
        typeof rawResponse === 'string' &&
        rawResponse.includes('<!DOCTYPE html>')
          ? 'Upstream service returned invalid HTML (likely Cloudflare 502)'
          : rawResponse || axiosError?.message || 'Request failed';

      this.logger.error(
        `Error calling ${endpoint}: ${axiosError?.message}`,
        axiosError.stack,
      );
      this.logger.error(`Status: ${status}`);
      this.logger.error(
        `Response (truncated): ${JSON.stringify(rawResponse || {}).slice(0, 1000)}`,
      );

      throw new HttpException(
        {
          message: cleanedMessage,
          upstreamStatus: status,
          endpoint,
        },
        status >= 400 && status < 600 ? status : 500,
      );
    }
  }

  async healthCheck() {
    return this.handleRequest('get', '/infoweb-api/health');
  }

  async createCustomer(dto: CreateCustomerDto) {
    return this.handleRequest('post', '/infoweb-api/customers', dto);
  }

  async getCustomerInfo(customerId: number, infoCode?: number) {
    return this.handleRequest(
      'get',
      `/infoweb-api/customer/${customerId}`,
      null,
      { infoCode },
    );
  }

  async getCustomerTransactions(customerId: number) {
    return this.handleRequest(
      'get',
      `/infoweb-api/customer/${customerId}/transactions`,
    );
  }

  // -------------------
  // Customer Involvement
  // -------------------
  async createCustomerInvolvement(
    customerId: number,
    invType?: string,
    status?: string,
    branchCode?: string,
    bodyPayload?: Record<string, any>,
  ) {
    return this.handleRequest('post', '/infoweb-api/customer-involvement', {
      customerId,
      invType,
      status,
      branchCode,
      ...bodyPayload,
    });
  }

  async subscribe(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number,
  ) {
    return this.handleRequest('post', '/infoweb-api/subscribe', {
      custAID,
      fundCode,
      effectiveDate,
      amount,
    });
  }

  async subscribeAndApprove(
    custAID: string,
    fundCode: string,
    effectiveDate: string,
    amount: number,
  ) {
    return this.handleRequest('post', '/infoweb-api/subscribe-and-approve', {
      custAID,
      fundCode,
      effectiveDate,
      amount,
    });
  }

  async redeem(
    custAID: string,
    fundCode: string,
    effectiveDate: string,
    amount: number,
  ) {
    return this.handleRequest('post', '/infoweb-api/redeem', {
      custAID,
      fundCode,
      effectiveDate,
      amount,
    });
  }

  async redeemAndApprove(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number,
  ) {
    return this.handleRequest('post', '/infoweb-api/redeem-and-approve', {
      custAID,
      fundCode,
      effectiveDate,
      amount,
    });
  }

  // -------------------
  // Portfolio & Products
  // -------------------
  async getPortfolioPosition(params?: string) {
    return this.handleRequest('get', '/infoweb-api/portfolio', null, {
      params,
    });
  }

  async listProducts() {
    return this.handleRequest('get', '/infoweb-api/products');
  }

  async getConfiguredBankProduct() {
    return this.handleRequest('get', '/infoweb-api/configured-bank-product');
  }

  async getMutualFundInvestmentHistory() {
    return this.handleRequest('get', '/infoweb-api/mutual-fund-history');
  }

  // -------------------
  // Fund Account
  // -------------------
  async fundAccount(query: FundAccountDto) {
    return this.handleRequest('get', '/infoweb-api/fund-account', null, query);
  }

  // -------------------
  // Valuation
  // -------------------
  // -------------------
  // Valuation (Cached)
  // -------------------
  private valuationCache = new Map<string, any>();
  private refreshInterval: NodeJS.Timer;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  onModuleInit() {
    this.logger.log(
      'Initializing InfowareService: Starting valuation cache refresh...',
    );
    // Initial fetch
    this.refreshValuations();
    // Schedule refresh every 30 minutes
    this.refreshInterval = setInterval(() => {
      this.refreshValuations();
    }, this.CACHE_TTL);
  }

  onModuleDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private async refreshValuations() {
    this.logger.log('Refreshing valuation cache for CGF and AIF...');
    try {
      const codes = ['CGF', 'AIF'];
      for (const code of codes) {
        const response = await this.fetchValuationFromApi(code);
        if (response.status === 'success') {
          this.valuationCache.set(code, response);
        }
      }
      this.logger.log('Valuation cache refreshed successfully.');
    } catch (error) {
      this.logger.error('Failed to refresh valuation cache', error.stack);
    }
  }

  async valuation(code: string) {
    if (code.toLowerCase() === 'mmf') {
      return this.getFundPrice();
    }

    // 1. Try to get from cache
    if (this.valuationCache.has(code)) {
      return this.valuationCache.get(code);
    }

    // 2. If not in cache (e.g. startup or error), fetch directly
    return this.fetchValuationFromApi(code);
  }

  private async fetchValuationFromApi(code: string) {
    const response = await this.handleRequest<InfowebValuationResponse>(
      'get',
      `/infoweb-api/valuation?code=${code}`,
    );

    if (!response?.DataTable?.Rows) {
      this.logger.warn(`Valuation data missing or malformed for code: ${code}`);
      return {
        status: 'error',
        message: `Valuation data missing or malformed for code: ${code}`,
        data: [],
      };
    }

    const formattedValuations = response.DataTable.Rows.slice(0, 2).map(
      (row: Record<string, any>) => ({
        MFCode: row['0'],
        ValuationDate: row['2'],
        UnitsOutstanding: Number(row['3']),
        Cost: Number(row['4']),
        GAV: Number(row['5']),
        Liabilities: Number(row['6']),
        NAV: Number(row['7']),
        WHTFee: Number(row['8']),
        BuyFee: Number(row['9']),
        SellFee: Number(row['10']),
        UnitPrice: Number(row['11']),
        BidPrice: Number(row['12']),
        OfferPrice: Number(row['13']),
        NetFees: Number(row['14']),
        AnnualisedYTDreturn_Bid: Number(row['15']),
        AnnualisedYTDreturn_Offer: Number(row['16']),
        DaysInYear: Number(row['17']),
        DayDiff: Number(row['18']),
      }),
    );

    const result = {
      status: response.StatusID === 0 ? 'success' : 'error',
      message:
        response.StatusMessage || 'Valuation data retrieved successfully',
      count: formattedValuations.length,
      data: formattedValuations,
    };

    // Update cache with fresh data
    if (result.status === 'success') {
      this.valuationCache.set(code, result);
    }

    return result;
  }

  private async getFundPrice(): Promise<any> {
    try {
      const url = `${this.baseUrl}/symplus/api/requests/get-fund-price`;
      const response = await this.externalApiCallsService.getData(url);

      if (!response || response.error || response.statusCode >= 400) {
        throw new InternalServerErrorException(
          response?.message || 'Failed to fetch fund price from Symplus',
        );
      }

      // Extract price details, assuming response contains simplified price info
      // If the response is already in the right format, this might need adjustment,
      // but typically get-fund-price returns a simple object.
      // We map the available fields to the Infoware/Standard Structure.

      const formattedValuation = {
        MFCode: 'MMF',
        ValuationDate: response.data.GetFundPrice[0]?.VALUE_DATE, // Use current date for MMF
        BidPrice: Number(response.data.GetFundPrice[0]?.BID_PRICE || 0),
        OfferPrice: Number(response.data.GetFundPrice[0]?.OFFER_PRICE || 0),
        DaysInYear: 365,
        DayDiff: 0,
      };

      return {
        status: 'success',
        message: 'Valuation data retrieved successfully',
        data: [formattedValuation],
      };
    } catch (error) {
      console.error(`Failed to fetch fund price`, error.stack);
      throw new InternalServerErrorException('Failed to fetch fund price');
    }
  }

  // -------------------
  // Logout
  // -------------------
  async logout() {
    return this.handleRequest('get', '/infoweb-api/logout');
  }
}
