import { join } from "path";
import { ConnectionOptions } from "typeorm";

const connectionOptions: ConnectionOptions = {
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 25060,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, "**", "*.entity.{ts,js}")],
  synchronize: false,
  dropSchema: false,
  migrationsRun: false,
  logging: ["warn", "error"],
  migrations: [join(__dirname, "src/migrations/*{.ts,.js}")],
  cli: {
    migrationsDir: "src/migrations",
  },
  extra: {
    idleTimeoutMIllis: 10000, // close idle connections after 20 secs
  },
};

export = connectionOptions;
