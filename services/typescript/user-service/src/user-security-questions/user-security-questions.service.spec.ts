import { Test, TestingModule } from '@nestjs/testing';
import { UserSecurityQuestionsService } from './user-security-questions.service';

describe('UserSecurityQuestionsService', () => {
  let service: UserSecurityQuestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSecurityQuestionsService],
    }).compile();

    service = module.get<UserSecurityQuestionsService>(
      UserSecurityQuestionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
