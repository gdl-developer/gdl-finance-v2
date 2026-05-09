import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggerService } from './audit-logger.service';

describe('AuditLoggerService', () => {
  let service: AuditLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLoggerService],
    }).compile();

    service = module.get<AuditLoggerService>(AuditLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
