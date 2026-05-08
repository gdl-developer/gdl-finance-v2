import { Test, TestingModule } from '@nestjs/testing';
import { OfficeBranchesController } from './office-branches.controller';
import { OfficeBranchesService } from './office-branches.service';

describe('OfficeBranchesController', () => {
  let controller: OfficeBranchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfficeBranchesController],
      providers: [OfficeBranchesService],
    }).compile();

    controller = module.get<OfficeBranchesController>(OfficeBranchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
