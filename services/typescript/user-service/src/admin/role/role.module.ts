import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { AdminRole } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminRole]),
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
