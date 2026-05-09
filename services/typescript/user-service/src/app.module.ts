import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as connectionOptions from '../ormconfig';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Exception Filters
import { HttpExceptionFilter } from './common/Exception-Filters/http-exception.filter';
import { ModelExceptionFilter } from './common/Exception-Filters/model-exception.filter';

// Modules
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module'; // ✅ Aggregator for all user-related modules
import { CompanyUserModule } from './company-user/company-user.module';
import { KycLevelsModule } from './kyc-levels/kyc-levels.module';
import { SeedingModule } from './seeding/seeding.module';
import { SecurityQuestionsModule } from './security-questions/security-questions.module';
import { UserSecurityQuestionsModule } from './user-security-questions/user-security-questions.module';
import { ReportingModule } from './reporting/reporting.module';
import { AuditLoggerModule } from './common/audit-logger/audit-logger.module';
import { AccessValidatorModule } from './common/audit-logger/access-validator/access-validator.module';
import { ExternalApiCallsModule } from './common/external-api-calls/external-api-calls-module';
import { CbaInteractionsModule } from './cba-interactions/cba-interactions.module';
import { JwtAuthUtilsModule } from './sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { FlexiModule } from './flexi/flexi.module';

// Interceptors & Middleware
import { AuditLoggerInterceptor } from './common/audit-logger/utils/audit-log.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HstsMiddleware } from './common/middlewares/hsts.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(connectionOptions),

    // Core modules
    AdminModule,
    UserModule, // ✅ Single entry for all user functionality
    CompanyUserModule,
    FlexiModule,

    // Business modules
    KycLevelsModule,
    SeedingModule,
    SecurityQuestionsModule,
    UserSecurityQuestionsModule,
    ReportingModule,

    // Common/infra modules
    AuditLoggerModule,
    AccessValidatorModule,
    ExternalApiCallsModule,
    CbaInteractionsModule,
    JwtAuthUtilsModule,
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: { prefix: 'user_service_' },
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60, // Relaxed from 10
      },
    ]),
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
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HstsMiddleware).forRoutes('*'); // Apply globally
  }
}
