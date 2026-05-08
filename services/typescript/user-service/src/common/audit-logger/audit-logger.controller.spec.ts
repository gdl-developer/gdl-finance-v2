import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggerController } from './audit-logger.controller';
import { AuditLoggerService } from './audit-logger.service';

describe('AuditLoggerController', () => {
  let controller: AuditLoggerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLoggerController],
      providers: [AuditLoggerService],
    }).compile();

    controller = module.get<AuditLoggerController>(AuditLoggerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
