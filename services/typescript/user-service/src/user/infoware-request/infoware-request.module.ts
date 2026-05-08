import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { InfowareController } from './infoware-request.controller';
import { SymplusProxyController } from './symplus-proxy.controller';
import { InfowareService } from './infoware-request.service';

import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { InvestmentRequestModule } from '../investment-request/investment-request.module';

@Module({
  imports: [ConfigModule, HttpModule, AbilityModule, ExternalApiCallsModule],
  controllers: [InfowareController, SymplusProxyController],
  providers: [InfowareService],
  exports: [InfowareService],
})
export class InfowareModule {}
