import {
  Controller,
  UseInterceptors,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { ReportingService } from './reporting.service';
import { Reporting } from './entities/reporting.entity';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { UserAccount } from 'src/user/user/entities/user.entity';

@ApiTags('User Reporting')
@Controller('reporting')
@UseInterceptors(ResponseInterceptor)
@UseGuards(AbilitiesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('subs')
  @CheckAbilities({ action: Action.ReadAll, subject: Reporting })
  @AuditLogger('FindUserReports')
  async findAll() {
    const reports = await this.reportingService.userReports();
    return { data: reports };
  }
  @Get('dashboard')
  @CheckAbilities({ action: Action.ReadAll, subject: Reporting })
  @AuditLogger('GetDashboardStats')
  async getDashboardStats(@Request() req: any) {
    const user = req.user;
    const isSuperAdmin =
      user?.user_type === 'SUPER_ADMIN' || user?.roles?.name === 'SUPER_ADMIN';
    const reports = await this.reportingService.dashboardStats(isSuperAdmin);
    return { data: reports };
  }
}
