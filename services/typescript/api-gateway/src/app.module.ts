import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './account/account.module';
import { ReportingModule } from './reporting/reporting.module';
import { FlexiModule } from './flexi/flexi.module';
import { InvestmentModule } from './investment/investment.module';
import { TransferModule } from './transfer/transfer.module';
import { DecryptionInterceptor } from './common/encryption/encryption.interceptor';
import { EncryptionModule } from './common/encryption/encryption.module';

@Module({
  imports: [
    AuthModule,
    AdminModule, 
    AccountModule, 
    ReportingModule, 
    FlexiModule, 
    InvestmentModule, 
    TransferModule,
    EncryptionModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3, // 3 requests per second for burst protection
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100, // 100 requests per minute for general usage
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 2000, // 2000 requests per hour
      },
    ]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DecryptionInterceptor,
    },
  ],
})
export class AppModule {}
