import { Test, TestingModule } from '@nestjs/testing';
import { OwnerDocsService } from './owner-docs.service';

describe('OwnerDocsService', () => {
  let service: OwnerDocsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OwnerDocsService],
    }).compile();

    service = module.get<OwnerDocsService>(OwnerDocsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
