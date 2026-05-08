import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { AuthService } from 'src/user/auth/auth.service';
import { Repository } from 'typeorm';
import { CheckSecurityQuestionDto } from './dto/check-security-question.dto';
import { CreateUserSecurityQuestionDto } from './dto/create-user-security-question.dto';
import { UserSecurityQuestion } from './entities/user-security-question.entity';
import { SecurityQuestion } from '../security-questions/entities/security-question.entity';

@Injectable()
export class UserSecurityQuestionsService extends AbstractService {
  constructor(
    @InjectRepository(UserSecurityQuestion)
    private readonly userSecQueRepo: Repository<UserSecurityQuestion>,
    @InjectRepository(SecurityQuestion)
    private readonly secQueRepo: Repository<SecurityQuestion>,
    private authService: AuthService,
  ) {
    super(userSecQueRepo);
  }

  async createSecurityQuestion(
    createUserSecQueDto: CreateUserSecurityQuestionDto,
  ) {
    const { email, password, security_questions, user_id } =
      createUserSecQueDto;

    // check password to be sure its accurate password first before setting the security question
    // because of the gap between account crreation and setting questions
    await this.validateUserForSecurity(email, password);

    const ques = [];
    for (const sec_que of security_questions) {
      const { question, answer } = sec_que;
      await this.checkExisting(user_id, question);

      const trimmed_answer = answer.trim();
      const hashed_answer = await this.hashSecurityAnswer(trimmed_answer);

      const que_res = await this.create({
        user_id: user_id,
        question: question,
        answer: hashed_answer, // hash answer.
      });

      ques.push(que_res);
    }

    return ques;
  }

  async checkExisting(user_id: number, question: string) {
    const que = await this.findOne({
      user_id,
      question,
    });

    if (que) {
      console.log('Security Question Already Added');
      // throw new NotAcceptableException('Security Question Already Added');
    }
  }

  async hashSecurityAnswer(answer: string) {
    return await this.authService.hashDetail(answer);
  }

  async checkSecurityQuestion(
    checkSecurityQueDto: CheckSecurityQuestionDto,
    user_id: number,
  ) {
    // TO DO Later: limit number of attempts for secuirty quesiton

    // get question
    const ques = await this.getQuestion(checkSecurityQueDto, user_id);

    const { answer } = checkSecurityQueDto;
    const hashed_answer = ques.answer;

    // get hashed answer and compare it with sent answer
    if (!(await this.compareSecurityAnswer(answer, hashed_answer))) {
      throw new NotAcceptableException('Invalid Answer To Security Question');
    }

    return 'success';
  }

  async getQuestion(
    checkSecurityQueDto: CheckSecurityQuestionDto,
    user_id: number,
  ): Promise<UserSecurityQuestion> {
    const { question_id } = checkSecurityQueDto;

    const question = await this.findOne({
      id: question_id,
      user_id: user_id,
    });

    if (!question)
      throw new NotFoundException('Unidentified Security Question');

    return question;
  }

  async compareSecurityAnswer(passed_answer: string, hashed_answer: string) {
    return await this.authService.compareSecurityQueAnswer(
      passed_answer,
      hashed_answer,
    );
  }

  async validateUserForSecurity(email: string, pass: string) {
    try {
      const user = await this.authService.validateUser(email, pass);
      console.log('validateUserForSecurity: User', user);
    } catch (error) {
      throw new NotAcceptableException(
        'Incorrect Password. Please use the password inputed during registration.',
      );
    }
  }

  async getSecurityQuestionOptions() {
    return await this.secQueRepo.find();
  }
}
