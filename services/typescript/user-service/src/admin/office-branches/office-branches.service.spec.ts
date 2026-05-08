import { Test, TestingModule } from '@nestjs/testing';
import { OfficeBranchesService } from './office-branches.service';

describe('OfficeBranchesService', () => {
  let service: OfficeBranchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OfficeBranchesService],
    }).compile();

    service = module.get<OfficeBranchesService>(OfficeBranchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
