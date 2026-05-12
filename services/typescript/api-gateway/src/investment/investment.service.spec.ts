import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentService } from './investment.service';

describe('InvestmentService', () => {
  let service: InvestmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentService,
        {
          provide: 'SYMPLUS_PACKAGE',
          useValue: {
            getService: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<InvestmentService>(InvestmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
