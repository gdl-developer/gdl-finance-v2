import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogger } from './entities/audit-logger.entity';
import { AuditLoggerService } from './audit-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogger])],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService, TypeOrmModule],
})
export class AuditLoggerCoreModule {}
