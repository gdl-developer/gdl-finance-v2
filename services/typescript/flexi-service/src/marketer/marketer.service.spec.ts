import { Test, TestingModule } from '@nestjs/testing';
import { MarketerService } from './marketer.service';

describe('MarketerService', () => {
  let service: MarketerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketerService],
    }).compile();

    service = module.get<MarketerService>(MarketerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
