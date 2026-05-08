import { Test, TestingModule } from '@nestjs/testing';
import { FlexiService } from './flexi.service';

describe('FlexiService', () => {
  let service: FlexiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlexiService],
    }).compile();

    service = module.get<FlexiService>(FlexiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
