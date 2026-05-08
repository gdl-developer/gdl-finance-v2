import { Module } from '@nestjs/common';
import { AccessValidator } from './access-validator.service';
import { AuditLoggerCoreModule } from '../audit-logger-core.module';
import { JwtAuthUtilsModule } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { EnvService } from 'src/common/env.service';

@Module({
  imports: [AuditLoggerCoreModule, JwtAuthUtilsModule],
  controllers: [],
  providers: [AccessValidator, EnvService],
  exports: [AccessValidator, EnvService],
})
export class AccessValidatorModule {}
