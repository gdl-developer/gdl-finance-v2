import { Module } from '@nestjs/common';
import { LoginHistoryService } from './login-history.service';
import { LoginHistoryController } from './login-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoginHistory]),

    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [LoginHistoryController],
  providers: [LoginHistoryService],
  exports: [LoginHistoryService],
})
export class LoginHistoryModule {}
