import { Module } from '@nestjs/common';
import { ExternalApiCallsService } from './external-api-calls.service';
import { AccessValidatorModule } from '../audit-logger/access-validator/access-validator.module';
import { EnvService } from '../env.service';

import { InternalSecurityService } from '../utils/internal-security.service';

@Module({
  imports: [AccessValidatorModule],
  providers: [ExternalApiCallsService, EnvService, InternalSecurityService],
  exports: [ExternalApiCallsService, InternalSecurityService],
})
export class ExternalApiCallsModule {}
