import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SecurityQuestionsService } from './security-questions.service';
import { CreateSecurityQuestionDto } from './dto/create-security-question.dto';
import { UpdateSecurityQuestionDto } from './dto/update-security-question.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { SecurityQuestion } from './entities/security-question.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Security Questions Config')
@Controller('config/security/questions')
export class SecurityQuestionsController {
  constructor(
    private readonly securityQuestionsService: SecurityQuestionsService,
  ) {}

  @Post()
  @AuditLogger('CreateSecurityQuestions')
  async CreateSecurityQues(
    @Body() createSecurityQueDto: CreateSecurityQuestionDto,
  ) {
    const que = await this.securityQuestionsService.createSecurityQue(
      createSecurityQueDto.question,
    );

    return { success: true, data: que };
  }

  @Get()
  // @UseGuards(AbilitiesGuard) - all users should be able to view hence allowed
  // @CheckAbilities({ action: Action.ReadAll, subject: SecurityQuestion })
  // @AuditLogger('FindSecurityQuestions')
  async findSecurityQues() {
    const que = await this.securityQuestionsService.findAll();
    return { success: true, data: que };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: SecurityQuestion })
  @AuditLogger('FindSecurityQuestion')
  async findSecurityQuestion(@Param('id') id: string) {
    const que = await this.securityQuestionsService.findOne(+id);
    return { success: true, data: que };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: SecurityQuestion })
  @AuditLogger('UpdateSecurityQuestion')
  async UpdateSecurityQuestion(
    @Param('id') id: string,
    @Body() updateSecurityQueDto: UpdateSecurityQuestionDto,
  ) {
    const que = await this.securityQuestionsService.update(+id, {
      ...updateSecurityQueDto,
    });

    return { success: true, data: que };
  }

  @Delete(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Delete, subject: SecurityQuestion })
  @AuditLogger('RemoveSecurityQuestion')
  async RemoveSecurityQuestion(@Param('id') id: string) {
    const que = await this.securityQuestionsService.remove(+id);
    return { success: true, data: que };
  }
}
