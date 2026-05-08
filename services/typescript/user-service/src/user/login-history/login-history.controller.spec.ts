import { Test, TestingModule } from '@nestjs/testing';
import { LoginHistoryController } from './login-history.controller';
import { LoginHistoryService } from './login-history.service';

describe('LoginHistoryController', () => {
  let controller: LoginHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginHistoryController],
      providers: [LoginHistoryService],
    }).compile();

    controller = module.get<LoginHistoryController>(LoginHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
