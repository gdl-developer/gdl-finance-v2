import { Module } from '@nestjs/common';
import { OfficeBranchesService } from './office-branches.service';
import { OfficeBranchesController } from './office-branches.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeBranch } from './entities/office-branch.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfficeBranch]),
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [OfficeBranchesController],
  providers: [OfficeBranchesService],
})
export class OfficeBranchesModule {}
