import {
  Injectable,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosRequestConfig } from "axios";
import {
  CreateCustomerDto,
  CreateCustomerResponseDto,
} from "./dto/create-customer.dto";

@Injectable()
export class InfowebApiService {
  private readonly logger = new Logger(InfowebApiService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly companyCode: string;
  private readonly username: string;
  private readonly password: string;

  private sessionId: string | null = null;
  private isRefreshing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.baseUrl = this.configService.get<string>("INFOWEB") ?? "";
    this.apiKey = this.configService.get<string>("INFOWEB_API_KEY") ?? "";
    this.companyCode =
      this.configService.get<string>("INFOWEB_COMPANY_CODE") ?? "";
    this.username = this.configService.get<string>("INFOWEB_USERNAME") ?? "";
    this.password = this.configService.get<string>("INFOWEB_PASSWORD") ?? "";

    if (!this.baseUrl) throw new Error("INFOWEB (base URL) is required in env");
    if (!this.apiKey)
      this.logger.warn(
        "INFOWEB_API_KEY not provided — requests may fail if API requires it"
      );
  }

  // -------------------------
  // HTTP Request Helper
  // -------------------------
  private async request<T>(
    config: AxiosRequestConfig,
    retryIfSessionExpired = true
  ): Promise<T> {
    config.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(config.headers || {}),
      ...(this.apiKey ? { "X-API-Key": this.apiKey } : {}),
    };

    try {
      const resp = await firstValueFrom(this.httpService.request<T>(config));
      this.logger.debug(
        `Infoweb call ${config.method} ${config.url} succeeded`
      );

      // Check if the response body indicates session expiration
      const responseData: any = resp.data;
      const isSessionExpiredInResponse =
        responseData?.StatusMessage === "SessionExpired" ||
        (responseData?.StatusID === 12 &&
          responseData?.StatusMessage?.toLowerCase().includes("session"));

      if (retryIfSessionExpired && isSessionExpiredInResponse) {
        this.logger.warn(
          "Session expired (detected in response body) — refreshing and retrying request once"
        );
        await this.refreshSession();
        return this.request<T>(config, false);
      }

      return resp.data;
    } catch (err: any) {
      const status = err.response?.status;
      const responseData = err.response?.data;
      const message =
        responseData?.message ||
        responseData ||
        err.message ||
        "Unknown Infoweb error";

      this.logger.error(
        `Infoweb call failed: ${config.method} ${config.url} => ${message}`
      );

      const isSessionError =
        status === 401 ||
        String(message).toLowerCase().includes("invalid session") ||
        String(message).toLowerCase().includes("session expired");

      if (retryIfSessionExpired && isSessionError) {
        this.logger.warn(
          "Session expired — refreshing and retrying request once"
        );
        await this.refreshSession();
        return this.request<T>(config, false);
      }

      if (status === 400) throw new BadRequestException(message);
      if (status === 401) throw new UnauthorizedException(message);

      throw new InternalServerErrorException(message);
    }
  }

  // -------------------------
  // Session Management
  // -------------------------
  private async createSession(): Promise<string> {
    const url = `${this.baseUrl}/api/json/LOGIN/${encodeURIComponent(
      this.companyCode
    )}/${encodeURIComponent(this.username)}/${encodeURIComponent(
      this.password
    )}`;

    this.logger.log("Requesting Infoweb session (LOGIN)...");
    const result = await this.request<any>({ method: "GET", url });

    const session =
      result?.data?.outValue ||
      result?.data?.OutValue ||
      result?.outValue ||
      result?.OutValue;

    if (!session) {
      this.logger.error("LOGIN did not return OutValue", result);
      throw new InternalServerErrorException(
        "Failed to obtain session ID from Infoweb LOGIN"
      );
    }

    this.sessionId = String(session);
    this.logger.log(`Infoweb session obtained: ${this.sessionId}`);
    return this.sessionId;
  }

  private async getSession(forceRefresh = false): Promise<string> {
    if (!this.sessionId || forceRefresh) {
      return this.createSession();
    }
    return this.sessionId;
  }

  private async refreshSession(): Promise<void> {
    if (this.isRefreshing) {
      this.logger.log("Session refresh already in progress — waiting...");
      await new Promise((res) => setTimeout(res, 800));
      return;
    }
    this.isRefreshing = true;
    try {
      this.sessionId = null;
      await this.createSession();
    } finally {
      this.isRefreshing = false;
    }
  }

  clearSession(): void {
    this.sessionId = null;
    this.logger.warn("Session cleared manually");
  }

  // -------------------------
  // Health Check
  // -------------------------
  async healthCheck(): Promise<{ status: string; baseUrl: string }> {
    this.logger.log("Performing Infoweb API health check");
    try {
      await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/health`, { timeout: 5000 })
      );
      return { status: "healthy", baseUrl: this.baseUrl };
    } catch (error: any) {
      this.logger.warn("Infoweb API health check failed", error.message);
      return { status: "unhealthy", baseUrl: this.baseUrl };
    }
  }

  // -------------------------
  // Customer Creation
  // -------------------------

  async getCustomerByEmail(email: string): Promise<any> {
    const session = await this.getSession();
    // PIW_000037 is getCustomerInfo, but we'll try to search using a generic search ID if known.
    // For now, let's implement a search that might work or at least provides the endpoint.
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000001&Params=${encodeURIComponent(email)}`;
    return this.request<any>({ method: "GET", url });
  }

  async getCustomerByPhone(phone: string): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000001&Params=${encodeURIComponent(phone)}`;
    return this.request<any>({ method: "GET", url });
  }

  async createCustomer(
    createCustomerDto: CreateCustomerDto
  ): Promise<CreateCustomerResponseDto> {
    const session = await this.getSession();
    this.logger.log(`Creating customer with session ID: ${session}`);

    const params = new URLSearchParams({
      AccountType: createCustomerDto.AccountType || "IND",
      Title: createCustomerDto.Title || "",
      Surname: createCustomerDto.lastName,
      FirstName: createCustomerDto.firstName,
      Othernames: createCustomerDto.Othernames || "",
      CompName: createCustomerDto.CompName || "",
      Sex: String(createCustomerDto.Sex),
      DateOfBirth: createCustomerDto.DateOfBirth,
      PermanentAddress: createCustomerDto.PermanentAddress,
      Nationality: createCustomerDto.Nationality,
      Telephone: createCustomerDto.phone,
      EmailAddress: createCustomerDto.email,
      BankAcctNumber: createCustomerDto.BankAcctNumber,
      BankCode: createCustomerDto.BankCode,
      NextOfKin: createCustomerDto.NextOfKin,
      BankAcctName: createCustomerDto.BankAcctName,
      City: createCustomerDto.City,
      State: createCustomerDto.State,
      Country: createCustomerDto.Country,
      BranchCode: createCustomerDto.BranchCode || "",
    }).toString();

    const url = `${this.baseUrl}/api/json/Cust_Create/${encodeURIComponent(
      session
    )}?${params}`;

    // Step 1: Create Customer
    let data = await this.request<any>({
      method: "POST",
      url,
    });

    this.logger.log(
      `Raw Infoweb Cust_Create response: ${JSON.stringify(data)}`
    );

    // Extract the custId from OutValue
    let custId = data?.OutValue || data?.outValue;

    // --- RECOVERY LOGIC: If creation failed because user exists, try to extract ID from error message ---
    if (
      !custId &&
      data?.StatusMessage &&
      data.StatusMessage.includes("already been used")
    ) {
      this.logger.warn(
        `Customer already exists. Attempting to extract ID from error: ${data.StatusMessage}`
      );
      // Regex to find patterns like EAT1237172 or numbers
      const match = data.StatusMessage.match(/[A-Z0-9]{5,}/);
      if (match) {
        custId = match[0];
        this.logger.log(
          `Successfully recovered existing ID from error message: ${custId}`
        );
        // Ensure data object exists and set OutValue for downstream services
        if (!data) data = {} as any;
        data.OutValue = custId;
      }
    }

    if (!custId) {
      this.logger.error(
        `Customer creation failed — no custId found in response`
      );
      const errorMsg =
        data?.StatusMessage ||
        "Customer ID (OutValue) not returned from Infoweb API";
      throw new BadRequestException(errorMsg);
    }

    this.logger.log(`Customer created successfully with custId: ${custId}`);

    // Step 2: Create Customer Involvement
    await this.createCustomerInvolvement(custId);
    await this.createCustomerInvolvementCanary(custId);
    this.logger.log(`Customer involvement created for custId: ${custId}`);

    // Step 3: Return combined response
    return {
      success: true,
      message: "Customer created successfully",
      data,
      sessionId: session,
      timestamp: new Date(),
    };
  }

  async createCustomerWithGeneratedSession(
    createCustomerDto: CreateCustomerDto
  ): Promise<CreateCustomerResponseDto> {
    const generatedSession = `SESSION_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;
    this.logger.log(
      `Generated session ID for customer creation: ${generatedSession}`
    );
    this.sessionId = generatedSession;
    return this.createCustomer(createCustomerDto);
  }

  // -------------------------
  // Customer Involvement
  // -------------------------
  async createCustomerInvolvement(
    custId: number,
    invType = "AIF",
    status = "True",
    branchCode = "006",
    bodyPayload?: Record<string, any>
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/Cust_Inv/${encodeURIComponent(
      session
    )}/${custId}?InvType=${encodeURIComponent(
      invType
    )}&Status=${encodeURIComponent(status)}&Branchcode=${encodeURIComponent(
      branchCode
    )}`;
    return this.request<any>({ method: "POST", url, data: bodyPayload ?? {} });
  }

  async createCustomerInvolvementCanary(
    custId: number,
    invType = "MF",
    status = "True",
    branchCode = "001",
    bodyPayload?: Record<string, any>
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/Cust_Inv/${encodeURIComponent(
      session
    )}/${custId}?InvType=${encodeURIComponent(
      invType
    )}&Status=${encodeURIComponent(status)}&Branchcode=${encodeURIComponent(
      branchCode
    )}`;
    return this.request<any>({ method: "POST", url, data: bodyPayload ?? {} });
  }
  // -------------------------
  // Portfolio & Products
  // -------------------------
  async getPortfolioPosition(params: string): Promise<any> {
    const session = await this.getSession();
    // chnage need to be made here for params
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000071&Params=${encodeURIComponent(params)}`;
    return this.request<any>({ method: "GET", url });
  }

  async getYield(
    fromDate: string,
    toDate: string,
    fundCode: string
  ): Promise<any> {
    const session = await this.getSession();
    const params = `${fromDate}|${toDate}|${fundCode}`;
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000074&Params=${encodeURIComponent(params)}`;
    return this.request<any>({ method: "GET", url });
  }

  async listProducts(): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=AM_00002&Params=`;
    return this.request<any>({ method: "GET", url });
  }

  async valuation(code: string): Promise<any> {
    const session = await this.getSession();

    // Two days ago
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const end = new Date();

    // Zero-padded YYYY-MM-DD format
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDate = formatDate(start);
    const endDate = formatDate(end);

    // Final format: YYYY-MM-DD|YYYY-MM-DD|CODE
    const params = `${startDate}|${endDate}|${code}`;

    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000074&Params=${params}`;

    return this.request<any>({ method: "GET", url });
  }

  async getConfiguredBankProduct(): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/PGetData2/${encodeURIComponent(
      session
    )}?FunctionID=PIW_000039&Params=`;
    return this.request<any>({ method: "GET", url });
  }

  async getMutualFundInvestmentHistory(): Promise<any> {
    // Often same as configured bank product endpoint
    return this.getConfiguredBankProduct();
  }

  // -------------------------
  // Core API Endpoints
  // -------------------------
  async getCustomerInfo(customerId: number, infoCode = 6): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/CustInfo/${encodeURIComponent(
      session
    )}/${customerId}/${infoCode}`;
    return this.request<any>({ method: "GET", url });
  }

  async getCustomerTransactions(customerId: number): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/CustInfo/${encodeURIComponent(
      session
    )}/${customerId}/9`;
    return this.request<any>({ method: "GET", url });
  }

  async redeem(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/AMMF_Redeem/${encodeURIComponent(
      session
    )}?CustAID=${custAID}&FundCode=${encodeURIComponent(
      fundCode
    )}&EffectiveDate=${encodeURIComponent(effectiveDate)}&Amount=${amount}`;
    return this.request<any>({ method: "POST", url });
  }

  async redeemAndApprove(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${
      this.baseUrl
    }/api/json/AMMF_RedeemAndApprove/${encodeURIComponent(
      session
    )}?CustAID=${custAID}&FundCode=${encodeURIComponent(
      fundCode
    )}&EffectiveDate=${encodeURIComponent(effectiveDate)}&Amount=${amount}`;
    return this.request<any>({ method: "POST", url });
  }

  async subscribe(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/AMMF_subscribe/${encodeURIComponent(
      session
    )}?CustAID=${custAID}&FundCode=${encodeURIComponent(
      fundCode
    )}&EffectiveDate=${encodeURIComponent(effectiveDate)}&Amount=${amount}`;
    return this.request<any>({ method: "POST", url });
  }

  async subscribeAndApprove(
    custAID: number,
    fundCode: string,
    effectiveDate: string,
    amount: number
  ): Promise<any> {
    const session = await this.getSession();
    const url = `${
      this.baseUrl
    }/api/json/AMMF_SubscribeAndApprove/${encodeURIComponent(
      session
    )}?CustAID=${custAID}&FundCode=${encodeURIComponent(
      fundCode
    )}&EffectiveDate=${encodeURIComponent(effectiveDate)}&Amount=${amount}`;
    return this.request<any>({ method: "POST", url });
  }

  async fundAccount(params: Record<string, any>): Promise<any> {
    const session = await this.getSession();
    const q = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/api/json/FundAccount2/${encodeURIComponent(
      session
    )}?${q}`;
    return this.request<any>({ method: "GET", url });
  }

  async getReportParameters(reportId: number): Promise<any> {
    const session = await this.getSession();
    const url = `${
      this.baseUrl
    }/api/json/Rpt_GetRptParameters/${encodeURIComponent(
      session
    )}?ReportID=${encodeURIComponent(String(reportId))}`;
    return this.request<any>({ method: "GET", url });
  }

  async logout(): Promise<any> {
    const session = await this.getSession();
    const url = `${this.baseUrl}/api/json/LOGOUT/${encodeURIComponent(
      session
    )}`;
    const resp = await this.request<any>({ method: "GET", url });
    this.clearSession();
    return resp;
  }
}
