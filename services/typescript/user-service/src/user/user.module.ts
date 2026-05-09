import { Module } from '@nestjs/common';
import { UserAccountModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AccountSettingsModule } from './account-settings/account-settings.module';
import { OwnerDocsModule } from './owner-docs/owner-docs.module';
import { LoginHistoryModule } from './login-history/login-history.module';
import { VirtualAccountModule } from './virtual-account/virtual-account.module';
import { InvestmentRequestModule } from './investment-request/investment-request.module';
import { InvestmentRequestIncomeModule } from './investment-request-income/investment-request.module';
import { InvestmentRequestCanaryModule } from './investment-request-canary/investment-request.module';
import { InvestmentPoolModule } from './investment-pull/investment-pull.module';
import { InfowareModule } from './infoware-request/infoware-request.module';
import { FixedDepositModule } from './fixed-deposit/fixed-deposit.module';

@Module({
  imports: [
    UserAccountModule, // 👈 now correctly exports UserService + repo
    AuthModule,
    OwnerDocsModule,
    AccountSettingsModule,
    LoginHistoryModule,
    VirtualAccountModule,
    InvestmentRequestModule,
    InvestmentRequestIncomeModule,
    InvestmentRequestCanaryModule,
    InvestmentPoolModule,
    InfowareModule,
    FixedDepositModule,
  ],
  exports: [
    UserAccountModule, // 👈 re-export so AppModule (and others) can use it
  ],
})
export class UserModule {}
