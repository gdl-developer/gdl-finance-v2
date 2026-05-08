import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { EnvService } from '../../common/env.service';

@Injectable()
export class QuoreIdService {
  private readonly logger = new Logger(QuoreIdService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService,
  ) {
    const config = this.envService.read();
    this.baseUrl = config.QUOREID_BASEURL;
    this.clientId = config.QUOREID_CLIENTID;
    this.secretKey = config.QUOREID_SECRETKEY;
  }

  private accessToken: string;
  private tokenExpiry: number;

  async verifyBvn(
    idNumber: string,
    payload: {
      firstname: string;
      lastname: string;
      dob?: string;
      phone?: string;
      email?: string;
      gender?: string;
    },
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const url = `${this.baseUrl}/v1/ng/identities/bvn-basic/${idNumber}`;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await lastValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      // response.data IS the actual QuoreID data object
      const data = response.data;

      if (!data || !data.status) {
        this.logger.error('Invalid QuoreID response structure', data);
        throw new Error('Invalid response from QuoreID');
      }

      // Extract relevant information without sensitive data
      // bvn-basic returns summary.bvn_check instead of bvn_match_check
      const isVerified =
        data.status?.status === 'verified' &&
        (data.summary?.bvn_check?.status === 'EXACT_MATCH' ||
          data.summary?.bvn_match_check?.status === 'EXACT_MATCH');

      // Return sanitized response without BVN number
      return {
        status: {
          state: data.status?.state,
          status: data.status?.status,
          verified: isVerified,
        },
        fieldMatches: {
          firstname: data.applicant?.firstname,
          lastname: data.applicant?.lastname,
        },
        matchStatus:
          data.summary?.bvn_check?.status ||
          data.summary?.bvn_match_check?.status,
        // Do NOT include bvn number or other sensitive data
      };
    } catch (error) {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || error.message || '';

      // Bypass "Insufficient wallet balance" in non-production environments
      const isLive = this.envService.read().NODE_ENV === 'live';
      if (
        !isLive &&
        errorMessage.toLowerCase().includes('insufficient wallet balance')
      ) {
        this.logger.warn(
          `Bypassing QuoreID failure (Insufficient Balance) in ${this.envService.read().NODE_ENV} mode.`,
        );
        return {
          status: {
            state: 'verified',
            status: 'verified',
            verified: true,
          },
          fieldMatches: {
            firstname: payload.firstname,
            lastname: payload.lastname,
          },
          matchStatus: 'EXACT_MATCH',
          isMock: true,
        };
      }

      this.logger.error(
        `QuoreID Verification Failed: ${errorMessage}`,
        errorData,
      );
      throw new HttpException(
        errorData || {
          message: errorMessage,
          error: 'Identity Verification Failed',
          statusCode: error.response?.status || HttpStatus.BAD_REQUEST,
        },
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if valid (with 60s buffer)
    if (
      this.accessToken &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - 60000
    ) {
      return this.accessToken;
    }

    this.logger.log('Refreshing QuoreID Access Token...');
    const url = `${this.baseUrl}/token`;

    // Check if config is loaded
    if (!this.clientId || !this.secretKey) {
      this.logger.error('QuoreID credentials missing in config');
      throw new Error('QuoreID Client ID or Secret Key is missing');
    }

    const body = {
      clientId: this.clientId,
      secret: this.secretKey,
    };

    try {
      const response = await lastValueFrom(this.httpService.post(url, body));

      const { accessToken, expiresIn, token, access_token } = response.data;
      // Handle various possible response formats
      const newToken = accessToken || token || access_token;

      if (!newToken) {
        throw new Error('No access token returned from auth endpoint');
      }

      this.accessToken = newToken;
      // Default 1 hour if not provided
      const expirySeconds = expiresIn || 3600;
      this.tokenExpiry = Date.now() + expirySeconds * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error(
        `Failed to generate QuoreID token: ${error.message}`,
        error.response?.data,
      );
      throw error;
    }
  }
}
