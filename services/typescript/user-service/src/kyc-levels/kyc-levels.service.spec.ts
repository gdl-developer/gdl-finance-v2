import { Test, TestingModule } from '@nestjs/testing';
import { KycLevelsService } from './kyc-levels.service';

describe('KycLevelsService', () => {
  let service: KycLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KycLevelsService],
    }).compile();

    service = module.get<KycLevelsService>(KycLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
