import { Module } from "@nestjs/common";
import { AuditLoggerService } from "./audit-logger.service";
import { AuditLoggerController } from "./audit-logger.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogger } from "./entities/audit-logger.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogger])],
  controllers: [AuditLoggerController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditLoggerModule {}
