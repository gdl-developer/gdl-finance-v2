import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentRequestService } from './investment-request.service';
import { InvestmentRequestController } from './investment-request.controller';
import { MMFInvestmentRequest } from './entities/investment-request.entity';
import { VirtualWallet } from '../virtual-account/entities/virtual-wallet.entity';
import { VirtualAccountModule } from '../virtual-account/virtual-account.module';
import { ExternalApiCallsModule } from '../../common/external-api-calls/external-api-calls-module';
import { UserAccountModule } from '../user/user.module';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { FundRedemptionMMFRequest } from './entities/redemption-request.entity';
import { CanaryInvestmentRequest } from '../investment-request-canary/entities/investment-request-canary.entity';
import { IncomeInvestmentRequest } from '../investment-request-income/entities/investment-request-income.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MMFInvestmentRequest,
      VirtualWallet,
      FundRedemptionMMFRequest,
      CanaryInvestmentRequest,
      IncomeInvestmentRequest,
    ]),
    VirtualAccountModule, // This already exports SymplusService
    ExternalApiCallsModule,
    UserAccountModule, // This provides UserService with all its dependencies
    NubanAccountsModule, // ✅ Provides NubanAccountsService with NubanAccount repository
  ],
  controllers: [InvestmentRequestController],
  providers: [InvestmentRequestService],
  exports: [InvestmentRequestService],
})
export class InvestmentRequestModule {}
