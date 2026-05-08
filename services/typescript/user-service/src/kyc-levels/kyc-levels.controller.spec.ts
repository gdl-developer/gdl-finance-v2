import { Test, TestingModule } from '@nestjs/testing';
import { KycLevelsController } from './kyc-levels.controller';
import { KycLevelsService } from './kyc-levels.service';

describe('KycLevelsController', () => {
  let controller: KycLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KycLevelsController],
      providers: [KycLevelsService],
    }).compile();

    controller = module.get<KycLevelsController>(KycLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
