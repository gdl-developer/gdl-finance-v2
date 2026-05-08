import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlexiController } from './flexi.controller';
import { FlexiService } from './flexi.service';
import { FlexiAuthGuard } from './guards/flexi-auth.guard';
import { FlexiRequest } from './entities/flexi-request.entity';
import { FlexiAgent } from './entities/flexi-agent.entity';
import { GdlMarketer } from './entities/gdl-marketer.entity';
import { FlexiDocument } from './entities/flexi-document.entity';
import { MMFInvestmentRequest } from '../user/investment-request/entities/investment-request.entity';
import { CbaInteractionsModule } from '../cba-interactions/cba-interactions.module';
import { AuditLoggerModule } from '../common/audit-logger/audit-logger.module';
import { UserAccountModule } from '../user/user/user.module';
import { JwtAuthUtilsModule } from '../sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { QuoreIdService } from './quore-id/quore-id.service';
import { HttpModule } from '@nestjs/axios';
import { EnvModule } from '../common/env.module';
import { Admin } from '../admin/admin/entities/admin.entity';

import { FlexiLoginHistory } from './entities/flexi-login-history.entity';
import { ApprovalWorkflow } from '../admin/approval-workflow/entities/approval-workflow.entity';
import { ApprovalWorkflowStep } from '../admin/approval-workflow/entities/approval-workflow-step.entity';
import { FlexiApprovalHistory } from './entities/flexi-approval-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlexiRequest,
      FlexiDocument,
      FlexiAgent,
      GdlMarketer,
      FlexiLoginHistory,
      MMFInvestmentRequest,
      ApprovalWorkflow,
      ApprovalWorkflowStep,
      FlexiApprovalHistory,
      Admin,
    ]),
    CbaInteractionsModule,
    AuditLoggerModule,
    UserAccountModule,
    JwtAuthUtilsModule,
    HttpModule,
    EnvModule,
  ],
  controllers: [FlexiController],
  providers: [FlexiService, FlexiAuthGuard, QuoreIdService],
  exports: [FlexiService],
})
export class FlexiModule {}
