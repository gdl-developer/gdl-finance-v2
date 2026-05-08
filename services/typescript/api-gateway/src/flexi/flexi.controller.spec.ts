import { Test, TestingModule } from '@nestjs/testing';
import { FlexiController } from './flexi.controller';

describe('FlexiController', () => {
  let controller: FlexiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlexiController],
    }).compile();

    controller = module.get<FlexiController>(FlexiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
