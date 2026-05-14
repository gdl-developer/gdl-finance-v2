import { Controller, Get, Query } from "@nestjs/common";
import { AuditLoggerService } from "./audit-logger.service";
import { ApiTags } from "@nestjs/swagger";
import { SearchLogsDto } from "./dto/search-logs.dto";

@ApiTags("Audit Logger")
@Controller("audit/logs")
export class AuditLoggerController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  @Get()
  async findAll(@Query() searchLogsDto: SearchLogsDto) {
    const { page, per_page, LOG_EKY, ...query } = searchLogsDto;
    const logs = await this.auditLoggerService.getAuditLogs(
      LOG_EKY,
      page,
      per_page,
      query
    );

    return { data: logs };
  }
}
