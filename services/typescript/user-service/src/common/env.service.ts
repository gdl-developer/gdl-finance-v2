import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { EnvData } from './env.schema';

@Injectable()
export class EnvService {
  private vars: EnvData;

  constructor() {
    const environment = process.env.NODE_ENV || 'development';

    // 1. Try to load environment variables from file if it exists
    const envFile = fs.existsSync(`.env.${environment}`)
      ? `.env.${environment}`
      : `.env`;

    let fileConfig = {};
    if (fs.existsSync(envFile)) {
      try {
        fileConfig = dotenv.parse(fs.readFileSync(envFile));
      } catch (err) {
        console.warn(`Failed to read env file: ${envFile}`, err.message);
      }
    }

    // 2. Merge File Config with System Process Env
    const data: any = { ...fileConfig, ...process.env };

    // 3. Normalize and transform
    data.APP_ENV = environment;
    data.NODE_ENV = data.NODE_ENV || environment;
    data.APP_DEBUG = data.APP_DEBUG === 'true' || data.APP_DEBUG === true;
    data.DB_PORT = data.DB_PORT ? parseInt(data.DB_PORT) : undefined;

    // JWT and Auth Fallbacks for Stability
    data.ACCESS_AUTH = data.ACCESS_AUTH || 'your_access_auth_secret';
    data.REFRESH_AUTH = data.REFRESH_AUTH || 'your_refresh_auth_secret';
    data.JWT_SECRET = data.JWT_SECRET || 'your_secret_key';

    // AWS default expiration
    if (!data.SIGNED_URL_EXPIRATION) {
      data.SIGNED_URL_EXPIRATION = '900'; // 15 minutes
    }

    data.DB_SYNCHRONIZE =
      data.DB_SYNCHRONIZE === 'true' || data.DB_SYNCHRONIZE === true;

    // 4. Basic Validation (Non-crashing)
    const requiredKeys = ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'];
    for (const key of requiredKeys) {
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
    return (
      this.vars.APP_ENV === 'production' || this.vars.NODE_ENV === 'production'
    );
  }
}
