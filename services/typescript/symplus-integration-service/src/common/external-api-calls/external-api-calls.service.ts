import axios from "axios";
import * as https from "https";
import {
  Inject,
  Injectable,
  Scope,
  InternalServerErrorException,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { encrypt } from "../utils/crypto-hash-helper";
import { InternalSecurityService } from "../utils/internal-security.service";

@Injectable({ scope: Scope.REQUEST })
export class ExternalApiCallsService {
  private readonly httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly configService: ConfigService,
    private readonly internalSecurityService: InternalSecurityService
  ) {}

  private getRefreshTokenFromRequest(): string | null {
    // Retrieve the token from the bearerauth header
    return (this.request.headers["bearerauth"] as string) || null;
  }

  private isInternalUrl(url: string): boolean {
    if (!url) return false;
    const internalUrls = [
      this.configService.get<string>("USER_BASE_URL"),
      this.configService.get<string>("ACCT_BASE_URL"),
      this.configService.get<string>("TXNS_BASE_URL"),
      this.configService.get<string>("NOTN_BASE_URL"),
      this.configService.get<string>("SAVEINVEST_BASE_URL"),
      this.configService.get<string>("BANKONE_SERVICE_BASE_URL"),
      this.configService.get<string>("SYMPLUS_SERVICE_BASE_URL"),
      this.configService.get<string>("HPA_BASE_URL"),
      this.configService.get<string>("DMS_BASE_URL"),
    ].filter(Boolean);

    return internalUrls.some((baseUrl) => url.startsWith(baseUrl));
  }

  private async buildAxiosConfig(
    token?: any,
    url?: string,
    body?: any,
    method?: string
  ) {
    const isInternal = url && this.isInternalUrl(url);

    // 1. Raw Mode for External Calls: If token is an object and URL is external, use it directly as headers
    if (!isInternal && url && token && typeof token === "object") {
      return {
        headers: token,
        httpsAgent: this.httpsAgent,
      };
    }

    let bearerToken = null;

    // 2. If token is explicitly passed as string, use it
    if (typeof token === "string") {
      bearerToken = token;
    }

    if (isInternal) {
      // Revert: For internal service-to-service calls, use the system-to-system token (SYS_AUTH)
      // instead of inheriting the user's JWT, to match what receiving guards expect.
      const sysAuth = this.configService.get<string>("SYS_AUTH");
      const eky = this.configService.get<string>("EKY");

      if (sysAuth && eky) {
        bearerToken = await encrypt(sysAuth, eky);
      }

      // Only if sys-auth is missing, try to inherit the incoming request's token
      if (!bearerToken) {
        bearerToken = this.getRefreshTokenFromRequest();
      }
    }

    const headers: any = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // 4. Handle custom header objects (for internal calls or if string token also provided)
    if (token && typeof token === "object") {
      Object.assign(headers, token);
    }

    // 5. Critical Fix: Only add bearerauth if it's internal or explicitly provided as string
    if (bearerToken && (isInternal || typeof token === "string")) {
      headers.bearerauth = bearerToken;
    }

    const config: any = {
      headers,
      httpsAgent: this.httpsAgent,
    };

    if (isInternal) {
      const { signature, timestamp } = this.internalSecurityService.signRequest(
        method || this.request.method || "POST",
        url,
        body
      );
      config.headers["x-gdl-signature"] = signature;
      config.headers["x-gdl-timestamp"] = timestamp;
      config.headers["x-gdl-service-id"] = "symplus-integration";
    }

    return config;
  }

  async postData(url: string, dataToPost: unknown, token?: any): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      token,
      url,
      dataToPost,
      "POST"
    );
    try {
      const response = await axios.post(url, dataToPost, axiosConfig);
      return response.data;
    } catch (error) {
      const errorData = error?.response?.data;
      console.error("Error in postData:", errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        "Error occurred in Post Data service call";
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async fetchData(url: string, token?: any): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      token,
      url,
      undefined,
      "GET"
    );
    try {
      const response = await axios.get(url, axiosConfig);
      if (response.status == 200) {
        return response.data;
      } else {
        throw new InternalServerErrorException(
          `Downstream service returned status ${response.status}`
        );
      }
    } catch (error) {
      const errorData = error?.response?.data;
      console.error("Error in fetchData:", errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        "Error occurred in Fetch Data service call";
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async patchData(
    url: string,
    data_to_patch: unknown,
    token?: any
  ): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      token,
      url,
      data_to_patch,
      "PATCH"
    );
    try {
      const response = await axios.patch(url, data_to_patch, axiosConfig);
      return response.data;
    } catch (error) {
      const errorData = error?.response?.data;
      console.error("Error in patchData:", errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        "Error occurred in Patch Data service call";
      throw new InternalServerErrorException(errorMessage);
    }
  }
}
