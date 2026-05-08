import { Test, TestingModule } from '@nestjs/testing';
import { UserSecurityQuestionsController } from './user-security-questions.controller';
import { UserSecurityQuestionsService } from './user-security-questions.service';

describe('UserSecurityQuestionsController', () => {
  let controller: UserSecurityQuestionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSecurityQuestionsController],
      providers: [UserSecurityQuestionsService],
    }).compile();

    controller = module.get<UserSecurityQuestionsController>(
      UserSecurityQuestionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
