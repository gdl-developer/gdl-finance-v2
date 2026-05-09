import { Test, TestingModule } from '@nestjs/testing';
import { CbaInteractionsService } from './cba-interactions.service';

describe('CbaInteractionsService', () => {
  let service: CbaInteractionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CbaInteractionsService],
    }).compile();

    service = module.get<CbaInteractionsService>(CbaInteractionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
