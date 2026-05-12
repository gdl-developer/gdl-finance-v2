import { Test, TestingModule } from '@nestjs/testing';
import { FlexiController } from './flexi.controller';
import { FlexiService } from './flexi.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

describe('FlexiController', () => {
  let controller: FlexiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlexiController],
      providers: [
        {
          provide: FlexiService,
          useValue: {
            proxyRequest: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FlexiController>(FlexiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
