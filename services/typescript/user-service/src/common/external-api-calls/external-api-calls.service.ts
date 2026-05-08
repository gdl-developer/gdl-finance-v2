import axios from 'axios';
import * as https from 'https';
import {
  Inject,
  Injectable,
  Scope,
  InternalServerErrorException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { EnvService } from '../env.service';
import { encrypt } from '../utils/crypto-hash-helper';
import { InternalSecurityService } from '../utils/internal-security.service';

@Injectable({ scope: Scope.REQUEST })
export class ExternalApiCallsService {
  private readonly httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly envService: EnvService,
    private readonly internalSecurityService: InternalSecurityService,
  ) {}

  private getRefreshTokenFromRequest(): string | null {
    return (this.request.headers['bearerauth'] as string) || null;
  }

  private isInternalUrl(url: string): boolean {
    if (!url) return false;
    const env = this.envService.read();
    const internalUrls = [
      env.USER_BASE_URL,
      env.ACCT_BASE_URL,
      env.TXNS_BASE_URL,
      env.NOTN_BASE_URL,
      env.SAVEINVEST_BASE_URL,
      env.BANKONE_SERVICE_BASE_URL,
      env.SYMPLUS_SERVICE_BASE_URL,
      env.HPA_BASE_URL,
      env.DMS_BASE_URL,
      'http://localhost',
      'http://127.0.0.1',
    ].filter(Boolean);

    return internalUrls.some((baseUrl) => url.startsWith(baseUrl));
  }

  private async buildAxiosConfig(
    method: string,
    token?: any,
    url?: string,
    body?: any,
  ) {
    const env = this.envService.read();
    const isInternal = url && this.isInternalUrl(url);

    // 1. Raw Mode for External Calls: If token is an object and URL is external, use it directly as headers
    if (!isInternal && url && token && typeof token === 'object') {
      return {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...token,
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      };
    }
    let bearerToken = null;

    // 2. If token is explicitly passed as string, use it
    if (typeof token === 'string') {
      bearerToken = token;
    }

    if (isInternal) {
      // 3. For internal URLs, prioritize passed token
      bearerToken = bearerToken || this.getRefreshTokenFromRequest();

      const sysAuth = env.SYS_AUTH;
      const eky = env.EKY;

      // If token is a JWT (starts with 'ey') and we are calling an internal service,
      // replace it with the encrypted system token that internal services expect.
      if (bearerToken?.startsWith('ey') || !bearerToken) {
        if (sysAuth && eky) {
          bearerToken = await encrypt(sysAuth, eky);
        }
      }
    }

    const headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // 4. Handle custom header objects
    if (token && typeof token === 'object') {
      Object.assign(headers, token);
    }

    // 5. Critical Fix: Add bearerauth for internal service-to-service calls or when provided as string
    if (bearerToken && (isInternal || typeof token === 'string')) {
      headers.bearerauth = bearerToken;
    }

    const config: any = {
      headers,
      httpsAgent: this.httpsAgent,
    };

    if (isInternal) {
      const { signature, timestamp } = this.internalSecurityService.signRequest(
        method,
        url,
        body,
      );
      config.headers['x-gdl-signature'] = signature;
      config.headers['x-gdl-timestamp'] = timestamp;
      config.headers['x-gdl-service-id'] = 'user-service';
    }

    return config;
  }

  async postData(url: string, dataToPost: unknown, token?: any): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      'POST',
      token,
      url,
      dataToPost,
    );
    try {
      const response = await axios.post(url, dataToPost, axiosConfig);
      return response.data;
    } catch (error) {
      const errorData = error?.response?.data;
      console.error('Error in postData:', errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        'Error occurred in Post Data service call';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async getData(url: string, token?: any, params?: any): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      'GET',
      token,
      url,
      undefined,
    );
    if (params) {
      axiosConfig['params'] = params;
    }

    try {
      const response = await axios.get(url, axiosConfig);
      return response.data;
    } catch (error) {
      const errorData = error?.response?.data;
      console.error('Error in getData:', errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        'Error occurred in Get Data service call';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async patchData(
    url: string,
    dataToPatch: unknown,
    token?: any,
  ): Promise<any> {
    const axiosConfig = await this.buildAxiosConfig(
      'PATCH',
      token,
      url,
      dataToPatch,
    );
    try {
      const response = await axios.patch(url, dataToPatch, axiosConfig);
      return response.data;
    } catch (error) {
      const errorData = error?.response?.data;
      console.error('Error in patchData:', errorData || error.message);
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message ||
        'Error occurred in Patch Data service call';
      throw new InternalServerErrorException(errorMessage);
    }
  }
}
