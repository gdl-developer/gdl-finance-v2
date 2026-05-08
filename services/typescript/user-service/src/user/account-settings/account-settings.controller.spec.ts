import { Test, TestingModule } from '@nestjs/testing';
import { AccountSettingsController } from './account-settings.controller';
import { AccountSettingsService } from './account-settings.service';

describe('AccountSettingsController', () => {
  let controller: AccountSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountSettingsController],
      providers: [AccountSettingsService],
    }).compile();

    controller = module.get<AccountSettingsController>(
      AccountSettingsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
