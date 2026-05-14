import { Module } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { HttpExceptionFilter } from "./common/Exception-Filters/http-exception.filter";
import { ModelExceptionFilter } from "./common/Exception-Filters/model-exception.filter";
import { AuditLoggerInterceptor } from "./common/audit-logger/utils/audit-log.interceptor";
// import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AccessValidatorModule } from "./common/audit-logger/access-validator/access-validator.module";
import { AuditLoggerModule } from "./common/audit-logger/audit-logger.module";
import { ExternalApiCallsModule } from "./common/external-api-calls/external-api-calls-module";
import { SymplusApiRequestsModule } from "./symplus-api-requests/symplus-api-requests.module";
import { CustomerManagementModule } from "./customer-management/customer-management.module";
import { GeneralModule } from "./general/general.module";
import { InfowebApiModule } from "./infoweb-api/infoweb-api.module";
import { SecurityModule } from "./common/security/security.module";
import { OptionalAuthGuard } from "./common/security/guards/optional-auth.guard";
import { SanitizingLoggerInterceptor } from "./common/security/interceptors/sanitizing-logger.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get<string>("DB_HOST"),
        port: parseInt(configService.get<string>("DB_PORT")),
        username: configService.get<string>("DB_USERNAME"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_NAME"),
        entities: [join(__dirname, "**", "*.entity.{ts,js}")],
        synchronize: false,
        dropSchema: false,
        migrationsRun: false,
        logging: ["warn", "error"],
        migrations: [join(__dirname, "src/migrations/*{.ts,.js}")],
        cli: {
          migrationsDir: "src/migrations",
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: parseInt(config.get<string>("THROTTLE_TTL") || "60"),
          limit: parseInt(config.get<string>("THROTTLE_LIMIT") || "100"),
        },
      ],
    }),
    SecurityModule,
    AuditLoggerModule,
    ExternalApiCallsModule,
    AccessValidatorModule,
    SymplusApiRequestsModule,
    CustomerManagementModule,
    GeneralModule,
    InfowebApiModule,
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: {
        enabled: true,
        config: { prefix: "symplus_int_" },
      },
    }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ModelExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OptionalAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizingLoggerInterceptor,
    },
    // {\n    //   provide: APP_INTERCEPTOR,
    //   useClass: AuditLoggerInterceptor,
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: ResponseInterceptor,
    // },
  ],
})
export class AppModule {}
