import { Test, TestingModule } from '@nestjs/testing';
import { SecurityQuestionsController } from './security-questions.controller';
import { SecurityQuestionsService } from './security-questions.service';

describe('SecurityQuestionsController', () => {
  let controller: SecurityQuestionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityQuestionsController],
      providers: [SecurityQuestionsService],
    }).compile();

    controller = module.get<SecurityQuestionsController>(
      SecurityQuestionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
