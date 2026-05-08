import { Module } from '@nestjs/common';
import { SecurityQuestionsService } from './security-questions.service';
import { SecurityQuestionsController } from './security-questions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityQuestion } from './entities/security-question.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityQuestion]),
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [SecurityQuestionsController],
  providers: [SecurityQuestionsService],
  exports: [SecurityQuestionsService],
})
export class SecurityQuestionsModule {}
