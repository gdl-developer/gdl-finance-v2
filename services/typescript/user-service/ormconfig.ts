import { join } from 'path';
import { EnvService } from './src/common/env.service';
import { ConnectionOptions } from 'typeorm';

const config = new EnvService().read();

const connectionOptions: ConnectionOptions = {
  type: (process.env.DB_TYPE as any) || 'postgres',
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,

  // ✅ works for CLI & runtime when built
  entities: [join(__dirname, '**', '*.entity.{js,ts}')],

  synchronize: config.DB_SYNCHRONIZE || false,
  dropSchema: false,
  migrationsRun: false,
  logging: false,
  migrations: [join(__dirname, 'src/migrations/*{.ts,.js}')],
  cli: { migrationsDir: 'src/migrations' },
  extra: {
    connectionLimit: 20, // max simultaneous connections in the pool
    acquireTimeout: 60000, // ms to wait for a connection before throwing (prevents Handshake timeout)
    connectTimeout: 60000, // ms for the initial TCP handshake
    waitForConnections: true, // queue requests when pool is full instead of failing immediately
    queueLimit: 0, // unlimited queue (0 = no limit)
    ssl: {
      rejectUnauthorized: false,
    },
  },
};

export = connectionOptions;
