import { Module } from '@nestjs/common';
import { InvestmentApprovalController } from './investment-approval.controller';
import { InvestmentRequestModule } from '../../user/investment-request/investment-request.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module'; // ✅ import AbilityModule
import { InvestmentRequestCanaryModule } from 'src/user/investment-request-canary/investment-request.module';
import { InvestmentRequestIncomeModule } from 'src/user/investment-request-income/investment-request.module';
import { InvestmentPoolModule } from 'src/user/investment-pull/investment-pull.module';

@Module({
  imports: [
    InvestmentRequestModule,
    InvestmentRequestCanaryModule,
    InvestmentRequestIncomeModule,
    AbilityModule, // ✅ now AbilityFactory will be available
    InvestmentPoolModule,
  ],
  controllers: [InvestmentApprovalController],
})
export class InvestmentApprovalModule {}
