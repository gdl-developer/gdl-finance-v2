import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { FlexiAdminModule } from 'src/admin/flexi/flexi-admin.module';
import { InvestmentRequestModule } from 'src/user/investment-request/investment-request.module';
import { InvestmentRequestCanaryModule } from 'src/user/investment-request-canary/investment-request.module';
import { InvestmentRequestIncomeModule } from 'src/user/investment-request-income/investment-request.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlexiRequest } from 'src/flexi/entities/flexi-request.entity';
import { FundRedemptionMMFRequest } from 'src/user/investment-request/entities/redemption-request.entity';
import { FundRedemptionCanaryRequest } from 'src/user/investment-request-canary/entities/redemption-canary-request.entity';
import { FundRedemptionIncomeRequest } from 'src/user/investment-request-income/entities/redemption-income-request.entity';
import { UserAccount } from 'src/user/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlexiRequest,
      FundRedemptionMMFRequest,
      FundRedemptionCanaryRequest,
      FundRedemptionIncomeRequest,
      UserAccount,
    ]),
    FlexiAdminModule,
    InvestmentRequestModule,
    InvestmentRequestCanaryModule,
    InvestmentRequestIncomeModule,
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
