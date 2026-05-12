import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  let service: ReportingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: 'REPORTING_PACKAGE',
          useValue: {
            getService: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
