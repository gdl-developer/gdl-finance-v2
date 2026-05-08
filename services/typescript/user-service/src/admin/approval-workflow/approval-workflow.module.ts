import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';
import { ApprovalWorkflowStep } from './entities/approval-workflow-step.entity';
import { Admin } from '../admin/entities/admin.entity';
import { AbilityModule } from '../../common/casl-ability-rbac/ability.module';
import { AuditLoggerModule } from '../../common/audit-logger/audit-logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalWorkflow, ApprovalWorkflowStep, Admin]),
    AbilityModule,
    AuditLoggerModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 30,
      },
    ]),
  ],
  controllers: [ApprovalWorkflowController],
  providers: [ApprovalWorkflowService],
  exports: [ApprovalWorkflowService],
})
export class ApprovalWorkflowModule {}
