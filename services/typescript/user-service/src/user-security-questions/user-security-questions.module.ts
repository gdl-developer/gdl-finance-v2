import { Module } from '@nestjs/common';
import { UserSecurityQuestionsService } from './user-security-questions.service';
import { UserSecurityQuestionsController } from './user-security-questions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecurityQuestion } from './entities/user-security-question.entity';
import { SecurityQuestion } from '../security-questions/entities/security-question.entity';
import { AuthModule } from 'src/user/auth/auth.module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSecurityQuestion, SecurityQuestion]),
    AuthModule,
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [UserSecurityQuestionsController],
  providers: [UserSecurityQuestionsService],
})
export class UserSecurityQuestionsModule {}
