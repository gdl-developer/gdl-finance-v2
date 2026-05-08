import { Module } from '@nestjs/common';
import { FixedDepositService } from './fixed-deposit.service';
import { FixedDepositsController } from './fixed-deposits.controller';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [ExternalApiCallsModule, AbilityModule],
  controllers: [FixedDepositsController],
  providers: [FixedDepositService],
  exports: [FixedDepositService],
})
export class FixedDepositModule {}
