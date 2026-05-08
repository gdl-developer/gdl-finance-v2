import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLogger as AuditLoggerDecorator } from '../audit-logger/utils/audit-log.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchLogsDto } from './dto/search-logs.dto';
import { SuperAdminGuard } from 'src/admin/auth/jwt/super-admin.guard';
import { AbilitiesGuard } from '../casl-ability-rbac/abilities.guard';
import { CheckAbilities } from '../casl-ability-rbac/abilities.decorator';
import { Action } from '../casl-ability-rbac/ability.factory';
import { AuditLogger } from './entities/audit-logger.entity';

@ApiTags('Audit Logger')
@ApiBearerAuth()
@UseGuards(AbilitiesGuard)
@Controller('audit/logger')
export class AuditLoggerController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  // Read logs — restricted to super admins only
  @Get()
  @UseGuards(SuperAdminGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: AuditLogger })
  async findAll(@Query() searchLogsDto: SearchLogsDto) {
    const { page, per_page, ...query } = searchLogsDto;
    const logs = await this.auditLoggerService.getAuditLogs(
      page,
      per_page,
      query,
    );

    return { data: logs };
  }

  // Log navigation — accessible to ALL admin types
  @Post('navigation')
  @AuditLoggerDecorator('AdminNavigation')
  async logNavigation(@Body() body: any) {
    return { success: true };
  }

  // Read single log — restricted to super admins only
  @Get(':id')
  @UseGuards(SuperAdminGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: AuditLogger })
  async findOne(@Param('id') id: string) {
    const log = await this.auditLoggerService.getAuditLogById(+id);
    return { data: log };
  }
}
