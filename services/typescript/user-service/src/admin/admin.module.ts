import { Module } from '@nestjs/common';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin/entities/admin.entity';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { AuthModule } from './auth/auth.module';
import { OfficeBranchesModule } from './office-branches/office-branches.module';
import { BusinessUnitsModule } from './business-units/business-units.module';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { CompanyModule } from './company/company.module';
import { InvestmentApprovalModule } from './investment-approval/investment-approval.module';
import { ApprovalWorkflowModule } from './approval-workflow/approval-workflow.module';
import { FlexiAdminModule } from './flexi/flexi-admin.module';
import { MarketersModule } from './marketers/marketers.module';

import { EnvModule } from 'src/common/env.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    RoleModule,
    PermissionModule,
    AuthModule,
    OfficeBranchesModule,
    BusinessUnitsModule,
    ExternalApiCallsModule,
    AbilityModule,
    AccessValidatorModule,
    CompanyModule,
    InvestmentApprovalModule,
    ApprovalWorkflowModule,
    FlexiAdminModule,
    MarketersModule,
    EnvModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
