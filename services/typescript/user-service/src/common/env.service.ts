import * as dotenv from 'dotenv';
import * as fs from 'fs';

export interface EnvData {
  // application
  APP_ENV: string;
  NODE_ENV: string;
  APP_DEBUG: boolean;

  // database
  DB_TYPE: 'mysql' | 'mariadb';
  DB_HOST?: string;
  DB_USERNAME: string;
  DB_PORT?: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  ACCT_BASE_URL: string;
  SAVEINVEST_BASE_URL: string;
  FRONT_END_BASE_URL: string;
  NOTN_BASE_URL: string;
  SYMPLUS_SERVICE_BASE_URL: string;
  TXNS_BASE_URL: string;
  HPA_BASE_URL: string;

  // auth
  SYS_AUTH: string;
  EKY: string;
  BEARERAUTH: string;
  ACCESS_AUTH: string;
  ADMIN_ACCESS_AUTH: string;
  REFRESH_AUTH: string;
  JWTCONSTANTS: string;

  // virtual account
  SETTLEMENT_ACCOUNT: string;
  SETTLEMENT_ACCOUNT_NAME: string;
  BANK_CODE: string;
  AMOUNT: string;
  DAYS_ACTIVE: string;
  MINUTES_ACTIVE: string;
  EXTRA_DATA?: string;
  CALLBACK_URL: string;

  // AWS credentials
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
  SIGNED_URL_EXPIRATION?: string; // optional, default handled in code

  // IP API Key
  IP_ADD_KEY: string;

  // Public Key Secret for backend decryption
  PUBLIC_KEY_SECRET: string;

  // new fields
  USER_BASE_URL: string;
  DEFAULT_BANK_CODE: string;
  BANKONE_SERVICE_BASE_URL: string;
  FLEXI_FRONTEND_BASE_URL?: string;

  // QuoreID
  QUOREID_BASEURL: string;
  QUOREID_CLIENTID: string;
  QUOREID_SECRETKEY: string;
  TEST_ADMIN_FRONTEND?: string;
  DEFAULT_PASSWORD?: string;
  DMS_BASE_URL: string;
  INTERNAL_SECURITY_KEY: string;
  SYSTEM_CURL?: string;
  PSTK_BASE_API_URL?: string;
  RMB_TOKEN?: string;
  RMB_BASE_API_URL?: string;
  DB_SYNCHRONIZE?: boolean;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class EnvService {
  private vars: EnvData;

  constructor() {
    // Determine which .env file to load
    const environment = process.env.NODE_ENV || 'development';
    const envFile = fs.existsSync(`.env.${environment}`)
      ? `.env.${environment}`
      : `.env`;

    // Parse the .env file
    const data: any = dotenv.parse(fs.readFileSync(envFile));

    // Normalize and transform
    data.APP_ENV = environment;
    data.NODE_ENV = data.NODE_ENV || environment;
    data.APP_DEBUG = data.APP_DEBUG === 'true';
    data.DB_PORT = data.DB_PORT ? parseInt(data.DB_PORT) : undefined;

    // AWS default expiration
    if (!data.SIGNED_URL_EXPIRATION) {
      data.SIGNED_URL_EXPIRATION = '900'; // 15 minutes
    }

    data.DB_SYNCHRONIZE = data.DB_SYNCHRONIZE === 'true';

    // Required variables check
    const requiredVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'S3_BUCKET_NAME',
      'IP_ADD_KEY',
      'PUBLIC_KEY_SECRET',
      'USER_BASE_URL',
      'DEFAULT_BANK_CODE',
    ];

    for (const key of requiredVars) {
      if (!data[key]) {
        console.warn(`Missing required environment variable: ${key}`);
      }
    }

    this.vars = data as EnvData;
  }

  // Returns the loaded environment variables
  read(): EnvData {
    return this.vars;
  }

  // Helper to check environment
  isDev(): boolean {
    return this.vars.APP_ENV === 'development';
  }

  isProd(): boolean {
    return this.vars.APP_ENV === 'production';
  }
}
