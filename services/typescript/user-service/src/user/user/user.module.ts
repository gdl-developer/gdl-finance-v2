import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccount } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { OwnerDocsModule } from '../owner-docs/owner-docs.module';
import { KycLevelsModule } from 'src/kyc-levels/kyc-levels.module';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { CbaInteractionsModule } from 'src/cba-interactions/cba-interactions.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { JwtAuthUtilsModule } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { InvestmentPoolModule } from '../investment-pull/investment-pull.module';

import { ConsentAuditLog } from './entities/consent-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount, ConsentAuditLog]),
    forwardRef(() => OwnerDocsModule),
    KycLevelsModule,
    ExternalApiCallsModule,
    CbaInteractionsModule,
    AbilityModule,
    AccessValidatorModule,
    JwtAuthUtilsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [
    UserService,
    TypeOrmModule.forFeature([UserAccount, ConsentAuditLog]),
  ],
})
export class UserAccountModule {}
