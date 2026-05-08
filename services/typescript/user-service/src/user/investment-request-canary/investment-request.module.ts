import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanaryInvestmentRequestService } from './investment-request.service';
import { InvestmentRequestController } from './investment-request.controller';
import { CanaryInvestmentRequest } from './entities/investment-request-canary.entity';
import { MMFInvestmentRequest } from '../investment-request/entities/investment-request.entity';
import { IncomeInvestmentRequest } from '../investment-request-income/entities/investment-request-income.entity';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { VirtualAccountModule } from '../virtual-account/virtual-account.module';
import { ExternalApiCallsModule } from '../../common/external-api-calls/external-api-calls-module';
import { UserAccountModule } from '../user/user.module';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { FundRedemptionCanaryRequest } from './entities/redemption-canary-request.entity';
import { InvestmentPoolModule } from '../investment-pull/investment-pull.module';
import { InfowareModule } from '../infoware-request/infoware-request.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CanaryInvestmentRequest,
      MMFInvestmentRequest,
      IncomeInvestmentRequest,
      VirtualWallet,
      FundRedemptionCanaryRequest,
    ]),
    VirtualAccountModule,
    ExternalApiCallsModule,
    UserAccountModule,
    InfowareModule,
    InvestmentPoolModule,
    NubanAccountsModule, // works now
  ],
  controllers: [InvestmentRequestController],
  providers: [CanaryInvestmentRequestService],
  exports: [CanaryInvestmentRequestService],
})
export class InvestmentRequestCanaryModule {}
