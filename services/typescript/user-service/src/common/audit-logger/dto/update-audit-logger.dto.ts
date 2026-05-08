import { PartialType } from '@nestjs/swagger';
import { CreateAuditLoggerDto } from './create-audit-logger.dto';

export class UpdateAuditLoggerDto extends PartialType(CreateAuditLoggerDto) {}
