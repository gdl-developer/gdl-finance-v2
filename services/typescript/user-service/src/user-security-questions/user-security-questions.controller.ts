import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { UserSecurityQuestionsService } from './user-security-questions.service';
import { CreateUserSecurityQuestionDto } from './dto/create-user-security-question.dto';
import { ApiTags } from '@nestjs/swagger';
import { CheckSecurityQuestionDto } from './dto/check-security-question.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { Request } from 'express';

@ApiTags('User Security Questions')
@Controller('u/security/ques')
export class UserSecurityQuestionsController {
  constructor(
    private readonly userSecQuesService: UserSecurityQuestionsService,
  ) {}

  @Post()
  @AuditLogger('CreateUserSecurityQuestion')
  async create(@Body() createSecurityQueDto: CreateUserSecurityQuestionDto) {
    const que =
      await this.userSecQuesService.createSecurityQuestion(
        createSecurityQueDto,
      );
    return { success: true, data: que };
  }

  // @Get()
  // @AuditLogger('GetAllSecurityQuestions')
  // async findAll() {
  //   const que = await this.userSecQuesService.findAll();
  //   return { success: true, data: que };
  // }

  @Get('user/:user_id') // bola blocked by session whoAmmI
  @AuditLogger('GetUserSecurityQuestions')
  async findUserQuestions(@Req() request: Request) {
    const { user_id } = request['whoAmmI'];
    const que = await this.userSecQuesService.findAllWithSearch({
      user_id: user_id,
    });
    return { success: true, data: que };
  }

  @Post('validate/answer')
  @AuditLogger('CheckSecurityQuestion')
  async checkSecurityQuestion(
    @Body() checkSecurityQueDto: CheckSecurityQuestionDto,
    @Req() request: Request,
  ) {
    const { user_id } = request['whoAmmI'];
    const que = await this.userSecQuesService.checkSecurityQuestion(
      checkSecurityQueDto,
      user_id,
    );
    return { success: true, data: que };
  }

  @Get('options')
  @AuditLogger('GetSecurityQuestionOptions')
  async getSecurityQuestionOptions() {
    const questions =
      await this.userSecQuesService.getSecurityQuestionOptions();
    return { success: true, data: questions };
  }

  @Get(':id')
  @AuditLogger('GetSecurityQuestion')
  async findOne(@Param('id') id: string) {
    const que = await this.userSecQuesService.findOne(+id);
    return { success: true, data: que };
  }
}
