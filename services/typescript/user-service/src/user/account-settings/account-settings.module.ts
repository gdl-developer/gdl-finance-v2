import { Module } from '@nestjs/common';
import { AccountSettingsService } from './account-settings.service';
import { AccountSettingsController } from './account-settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSetting } from './entities/account-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountSetting])],
  controllers: [AccountSettingsController],
  providers: [AccountSettingsService],
  exports: [AccountSettingsService],
})
export class AccountSettingsModule {}
