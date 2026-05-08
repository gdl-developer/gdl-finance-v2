import { Module } from '@nestjs/common';
import { MarketersService } from './marketers.service';
import { MarketersController } from './marketers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marketer } from './entities/marketer.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marketer]),
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [MarketersController],
  providers: [MarketersService],
  exports: [MarketersService],
})
export class MarketersModule {}
