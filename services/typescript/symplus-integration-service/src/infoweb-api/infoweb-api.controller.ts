import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from "@nestjs/swagger";
import { InfowebApiService } from "./infoweb-api.service";
import {
  CreateCustomerDto,
  CreateCustomerResponseDto,
  FundAccountDto,
} from "./dto/create-customer.dto";

@ApiTags("Infoweb API")
@Controller("infoweb-api")
export class InfowebApiController {
  private readonly logger = new Logger(InfowebApiController.name);

  constructor(private readonly infowebApiService: InfowebApiService) {}

  // -------------------
  // Health & Info checked
  // -------------------
  @Get("health")
  @ApiOperation({ summary: "Infoweb API Health Check" })
  async healthCheck(): Promise<{
    status: string;
    baseUrl: string;
    timestamp: Date;
  }> {
    try {
      const healthStatus = await this.infowebApiService.healthCheck();
      return { ...healthStatus, timestamp: new Date() };
    } catch {
      return { status: "unhealthy", baseUrl: "unknown", timestamp: new Date() };
    }
  }

  // -----------------------------------
  // Valuation
  // -----------------------------------
  @Get("valuation")
  @ApiOperation({ summary: "Get Valuation Data" })
  @ApiQuery({
    name: "code",
    required: true,
    description: "Fund code",
  })
  async valuation(@Query("code") code: string) {
    return this.infowebApiService.valuation(code);
  }

  @Get("info")
  @ApiOperation({ summary: "Get Infoweb API Information" })
  getApiInfo() {
    return {
      name: "Infoweb API Integration",
      version: "1.0.0",
      description: "Customer creation integration with Infoweb API",
      endpoints: [
        "POST /infoweb-api/customers",
        "POST /infoweb-api/customer-involvement",
        "POST /infoweb-api/subscribe",
        "POST /infoweb-api/subscribe-and-approve",
        "POST /infoweb-api/redeem",
        "POST /infoweb-api/redeem-and-approve",
        "GET /infoweb-api/customer/:id",
        "GET /infoweb-api/customer/:id/transactions",
        "GET /infoweb-api/portfolio",
        "GET /infoweb-api/products",
        "GET /infoweb-api/fund-account",
        "GET /infoweb-api/report-parameters/:reportId",
        "GET /infoweb-api/logout",
      ],
      timestamp: new Date(),
    };
  }

  // -------------------
  // Logout
  // -------------------
  @Get("logout")
  @ApiOperation({ summary: "Logout" })
  async logout() {
    return this.infowebApiService.logout();
  }

  // -------------------
  // Customer Endpoints
  // -------------------
  @Post("customers")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Create Customer" })
  async createCustomer(
    @Body() createCustomerDto: CreateCustomerDto
  ): Promise<CreateCustomerResponseDto> {
    console.log("CreateCustomerDto received:", createCustomerDto);
    return this.infowebApiService.createCustomer(createCustomerDto);
  }

  @Get("customer/search/email")
  @ApiOperation({ summary: "Search Customer by Email" })
  async searchByEmail(@Query("email") email: string) {
    return this.infowebApiService.getCustomerByEmail(email);
  }

  @Get("customer/search/phone")
  @ApiOperation({ summary: "Search Customer by Phone" })
  async searchByPhone(@Query("phone") phone: string) {
    return this.infowebApiService.getCustomerByPhone(phone);
  }

  @Get("customer/:customerId")
  @ApiOperation({ summary: "Get Customer Info" })
  async getCustomerInfo(
    @Param("customerId") customerId: number,
    @Query("infoCode") infoCode?: number
  ) {
    return this.infowebApiService.getCustomerInfo(customerId, infoCode);
  }

  @Get("customer/:customerId/transactions")
  @ApiOperation({ summary: "Get Customer Transactions" })
  async getCustomerTransactions(@Param("customerId") customerId: number) {
    return this.infowebApiService.getCustomerTransactions(customerId);
  }

  // -------------------
  // Customer Involvement
  // -------------------
  @Post("customer-involvement")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Create Customer Involvement" })
  async customerInvolvement(
    @Body("customerId") customerId: number,
    @Body("invType") invType?: string,
    @Body("status") status?: string,
    @Body("branchCode") branchCode?: string,
    @Body() bodyPayload?: Record<string, any>
  ) {
    return this.infowebApiService.createCustomerInvolvement(
      customerId,
      invType,
      status,
      branchCode,
      bodyPayload
    );
  }

  // -------------------
  // Investment Actions
  // -------------------
  @Post("subscribe")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Subscribe to a fund" })
  async subscribe(
    @Body()
    body: {
      custAID: number;
      fundCode: string;
      effectiveDate: string;
      amount: number;
    }
  ) {
    return this.infowebApiService.subscribe(
      body.custAID,
      body.fundCode,
      body.effectiveDate,
      body.amount
    );
  }

  @Post("subscribe-and-approve")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Subscribe and Approve" })
  async subscribeAndApprove(
    @Body()
    body: {
      custAID: number;
      fundCode: string;
      effectiveDate: string;
      amount: number;
    }
  ) {
    return this.infowebApiService.subscribeAndApprove(
      body.custAID,
      body.fundCode,
      body.effectiveDate,
      body.amount
    );
  }

  @Post("redeem")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Redeem a fund" })
  async redeem(
    @Body()
    body: {
      custAID: number;
      fundCode: string;
      effectiveDate: string;
      amount: number;
    }
  ) {
    return this.infowebApiService.redeem(
      body.custAID,
      body.fundCode,
      body.effectiveDate,
      body.amount
    );
  }

  @Post("redeem-and-approve")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Redeem and Approve" })
  async redeemAndApprove(
    @Body()
    body: {
      custAID: number;
      fundCode: string;
      effectiveDate: string;
      amount: number;
    }
  ) {
    return this.infowebApiService.redeemAndApprove(
      body.custAID,
      body.fundCode,
      body.effectiveDate,
      body.amount
    );
  }

  // -------------------
  // Portfolio & Products
  // -------------------
  @Get("portfolio")
  @ApiOperation({ summary: "Get Portfolio Position" })
  async getPortfolioPosition(@Query("params") params?: string) {
    return this.infowebApiService.getPortfolioPosition(params ?? "");
  }

  @Get("yield")
  @ApiOperation({ summary: "Get Yield / Valuation" })
  async getYield(
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("fundCode") fundCode?: string
  ) {
    return this.infowebApiService.getYield(fromDate, toDate, fundCode);
  }

  @Get("products")
  @ApiOperation({ summary: "List Products" })
  async listProducts() {
    return this.infowebApiService.listProducts();
  }

  @Get("configured-bank-product")
  @ApiOperation({ summary: "Get Configured Bank Product" })
  async getConfiguredBankProduct() {
    return this.infowebApiService.getConfiguredBankProduct();
  }

  @Get("mutual-fund-history")
  @ApiOperation({ summary: "Get Mutual Fund Investment History" })
  async getMutualFundInvestmentHistory() {
    return this.infowebApiService.getMutualFundInvestmentHistory();
  }

  // -------------------
  // Fund Account & Reports
  // -------------------
  // @Get('fund-account')
  // @UsePipes(new ValidationPipe({ transform: true }))
  // @ApiOperation({ summary: 'Fund an Account' })
  // async fundAccount(@Query() query: FundAccountDto) {
  //   return this.infowebApiService.fundAccount(query);
  // }

  @Get("report-parameters/:reportId")
  @ApiOperation({ summary: "Get Report Parameters" })
  async getReportParameters(@Param("reportId") reportId: number) {
    return this.infowebApiService.getReportParameters(reportId);
  }

  @Get("fund-account")
  @ApiOperation({ summary: "Fund Account (Legacy Endpoint)" })
  @ApiParam({ name: "Session", description: "Session ID", required: true })
  async fundAccount(@Query() query: FundAccountDto) {
    // Remove sessionId from query if present to avoid confusion, though service handles it
    const { ...params } = query;
    return this.infowebApiService.fundAccount(params);
  }
}
