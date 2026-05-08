import { Module } from '@nestjs/common';
import { KycLevelsService } from './kyc-levels.service';
import { KycLevelsController } from './kyc-levels.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycLevel } from './entities/kyc-level.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycLevel]),
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [KycLevelsController],
  providers: [KycLevelsService],
  exports: [KycLevelsService],
})
export class KycLevelsModule {}
