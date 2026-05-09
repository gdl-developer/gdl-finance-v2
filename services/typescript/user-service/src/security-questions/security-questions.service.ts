import {
  Injectable,
  NotAcceptableException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { Repository } from 'typeorm';
import { SecurityQuestion } from './entities/security-question.entity';

@Injectable()
export class SecurityQuestionsService extends AbstractService {
  constructor(
    @InjectRepository(SecurityQuestion)
    private readonly securityQuestioRepo: Repository<SecurityQuestion>,
  ) {
    super(securityQuestioRepo);
  }

  async createSecurityQue(question: string) {
    await this.checkExisting(question);

    const que_res = await this.create({
      question: question,
    });

    if (!que_res)
      throw new NotImplementedException('Security Question Creation Failed');

    return que_res;
  }

  async checkExisting(question: string) {
    const que = await this.findOne({
      question,
    });

    if (que) throw new NotAcceptableException('Question Already Exist');
  }
}
