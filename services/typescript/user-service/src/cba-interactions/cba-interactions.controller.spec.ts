import { Test, TestingModule } from '@nestjs/testing';
import { CbaInteractionsController } from './cba-interactions.controller';
import { CbaInteractionsService } from './cba-interactions.service';

describe('CbaInteractionsController', () => {
  let controller: CbaInteractionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CbaInteractionsController],
      providers: [CbaInteractionsService],
    }).compile();

    controller = module.get<CbaInteractionsController>(
      CbaInteractionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
