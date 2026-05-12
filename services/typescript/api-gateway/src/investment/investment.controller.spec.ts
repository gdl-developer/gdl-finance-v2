import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

describe('InvestmentController', () => {
  let controller: InvestmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentController],
      providers: [
        {
          provide: InvestmentService,
          useValue: {
            getMutualFunds: jest.fn(),
            getPrice: jest.fn(),
            getCustomerInvestments: jest.fn(),
            subscribe: jest.fn(),
            redeem: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvestmentController>(InvestmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
