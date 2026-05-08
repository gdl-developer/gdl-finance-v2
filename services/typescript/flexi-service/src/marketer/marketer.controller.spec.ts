import { Test, TestingModule } from '@nestjs/testing';
import { MarketerController } from './marketer.controller';

describe('MarketerController', () => {
  let controller: MarketerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketerController],
    }).compile();

    controller = module.get<MarketerController>(MarketerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
