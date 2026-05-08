import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlexiAdminService } from './flexi-admin.service';
import { FlexiAdminController } from './flexi-admin.controller';
import { FlexiRequest } from 'src/flexi/entities/flexi-request.entity';
import { FlexiApprovalHistory } from 'src/flexi/entities/flexi-approval-history.entity';
import { FlexiDocument } from 'src/flexi/entities/flexi-document.entity';
import { FlexiAgent } from 'src/flexi/entities/flexi-agent.entity';
import { GdlMarketer } from 'src/flexi/entities/gdl-marketer.entity';
import { ApprovalWorkflow } from '../approval-workflow/entities/approval-workflow.entity';
import { ApprovalWorkflowStep } from '../approval-workflow/entities/approval-workflow-step.entity';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AuditLoggerModule } from 'src/common/audit-logger/audit-logger.module';
import { JwtAuthUtilsModule } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { FlexiModule } from 'src/flexi/flexi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlexiRequest,
      FlexiApprovalHistory,
      FlexiDocument,
      FlexiAgent,
      GdlMarketer,
      ApprovalWorkflow,
      ApprovalWorkflowStep,
    ]),
    AbilityModule,
    AccessValidatorModule,
    AuditLoggerModule,
    JwtAuthUtilsModule,
    FlexiModule,
  ],
  controllers: [FlexiAdminController],
  providers: [FlexiAdminService],
  exports: [FlexiAdminService],
})
export class FlexiAdminModule {}
