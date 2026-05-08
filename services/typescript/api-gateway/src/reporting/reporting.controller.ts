import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('reporting')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @Permissions('admin.view_dashboard')
  getDashboardStats(@Query('super') isSuper: string) {
    return this.reportingService.getDashboardStats(isSuper === 'true');
  }

  @Get('growth')
  @Permissions('admin.view_growth')
  getUserGrowth(@Query('days') days: string) {
    return this.reportingService.getUserGrowth(parseInt(days) || 7);
  }
}
