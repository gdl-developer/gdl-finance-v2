import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentRequestIncomeService } from './investment-request.service';
import { InvestmentRequestController } from './investment-request.controller';
import { IncomeInvestmentRequest } from './entities/investment-request-income.entity';
import { MMFInvestmentRequest } from '../investment-request/entities/investment-request.entity';
import { CanaryInvestmentRequest } from '../investment-request-canary/entities/investment-request-canary.entity';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { FundRedemptionIncomeRequest } from './entities/redemption-income-request.entity';
import { VirtualAccountModule } from '../virtual-account/virtual-account.module';
import { ExternalApiCallsModule } from '../../common/external-api-calls/external-api-calls-module';
import { UserAccountModule } from '../user/user.module';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { InvestmentPoolModule } from '../investment-pull/investment-pull.module';
import { InfowareModule } from '../infoware-request/infoware-request.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomeInvestmentRequest,
      MMFInvestmentRequest,
      CanaryInvestmentRequest,
      VirtualWallet,
      FundRedemptionIncomeRequest,
    ]),
    VirtualAccountModule, // This already exports SymplusService
    ExternalApiCallsModule,
    UserAccountModule, // This provides UserService with all its dependencies
    InfowareModule,
    InvestmentPoolModule,
    NubanAccountsModule,
  ],
  controllers: [InvestmentRequestController],
  providers: [InvestmentRequestIncomeService],
  exports: [InvestmentRequestIncomeService],
})
export class InvestmentRequestIncomeModule {}
