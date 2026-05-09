import { Module } from '@nestjs/common';
import { AuditLoggerController } from './audit-logger.controller';
import { AbilityModule } from '../casl-ability-rbac/ability.module';
import { EnvModule } from '../env.module';
import { AuditLoggerCoreModule } from './audit-logger-core.module';

@Module({
  imports: [AuditLoggerCoreModule, AbilityModule, EnvModule],
  controllers: [AuditLoggerController],
  providers: [],
  exports: [AuditLoggerCoreModule],
})
export class AuditLoggerModule {}
