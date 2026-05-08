import { Test, TestingModule } from '@nestjs/testing';
import { AccountSettingsService } from './account-settings.service';

describe('AccountSettingsService', () => {
  let service: AccountSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountSettingsService],
    }).compile();

    service = module.get<AccountSettingsService>(AccountSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
