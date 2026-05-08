import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from './interfaces/request.interface';

@Controller('config/security/questions')
export class SecurityQuestionsConfigController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.getSecurityQuestions();
  }
}

@Controller('u/security/ques')
@UseGuards(AuthGuard)
export class UserSecurityQuestionsController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  setAnswers(@Req() req: AuthenticatedRequest, @Body('answers') answers: any[]) {
    return this.authService.setSecurityQuestions(req.user.user_id, answers);
  }

  @Post('validate/answer')
  verifyAnswer(@Req() req: AuthenticatedRequest, @Body() body: any) {
    // Logic to verify a single answer
    return this.authService.verifySecurityAnswer(req.user.user_id, body.question_id, body.answer);
  }

  @Get('options')
  getOptions() {
    return this.authService.getSecurityQuestions();
  }
}
