export interface EnvData {
  APP_ENV: string;
  NODE_ENV: string;
  APP_DEBUG: boolean;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;
  JWT_SECRET: string;
  ACCESS_AUTH: string;
  REFRESH_AUTH: string;
  ADMIN_ACCESS_AUTH: string;
  SIGNED_URL_EXPIRATION: string;
  FRONT_END_BASE_URL: string;
  TEST_ADMIN_FRONTEND?: string;
  PAYLOAD_ENCRYPTION_SECRET: string;
}
