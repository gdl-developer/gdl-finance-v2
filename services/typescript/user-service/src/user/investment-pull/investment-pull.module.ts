import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccountModule } from '../user/user.module';
import { Admin } from 'src/admin/admin/entities/admin.entity';
import { AdminModule } from 'src/admin/admin.module';
import { UserInvestmentPool } from './entities/investment-pull.entity';
import { TransactionAudit } from './entities/transaction-audit.entity';
import { DailyAccrualLog } from './entities/investment-pool-accrued-log.entity';
import { InvestmentPoolController } from './investment-pull.controller';
import { InvestmentPoolService } from './investment-pull.service';
import { InvestmentPoolCreateService } from './pool-create.service';
import { InvestmentPoolUpdateService } from './pool-update.service';
import { InvestmentPoolDeductionService } from './pool-deduction.service';
import { AuditService } from './audit.service';
import { InfowareModule } from '../infoware-request/infoware-request.module';
import { VirtualAccountModule } from '../virtual-account/virtual-account.module';
import { InvestmentRequestModule } from '../investment-request/investment-request.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInvestmentPool,
      TransactionAudit,
      DailyAccrualLog,
      Admin,
    ]),
    UserAccountModule,
    VirtualAccountModule,
    forwardRef(() => AdminModule),
    InfowareModule,
    InvestmentRequestModule,
  ],
  controllers: [InvestmentPoolController],
  providers: [
    InvestmentPoolService,
    InvestmentPoolCreateService,
    InvestmentPoolUpdateService,
    InvestmentPoolDeductionService,
    AuditService,
  ],
  exports: [InvestmentPoolService],
})
export class InvestmentPoolModule {}
