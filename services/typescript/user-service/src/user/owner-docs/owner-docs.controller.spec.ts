import { Test, TestingModule } from '@nestjs/testing';
import { OwnerDocsController } from './owner-docs.controller';
import { OwnerDocsService } from './owner-docs.service';

describe('OwnerDocsController', () => {
  let controller: OwnerDocsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnerDocsController],
      providers: [OwnerDocsService],
    }).compile();

    controller = module.get<OwnerDocsController>(OwnerDocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
