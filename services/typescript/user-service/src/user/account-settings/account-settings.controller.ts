// import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountSettingsService } from './account-settings.service';
// import { CreateAccountSettingDto } from './dto/create-account-setting.dto';
// import { UpdateAccountSettingDto } from './dto/update-account-setting.dto';

@ApiTags('User Account Settings')
@Controller('user/account/settings')
export class AccountSettingsController {
  constructor(
    private readonly accountSettingsService: AccountSettingsService,
  ) {}

  // @Post()
  // async create(@Body() createAccountSettingDto: CreateAccountSettingDto) {
  //   const acct = await this.accountSettingsService.create(
  //     createAccountSettingDto,
  //   );

  //   if (!acct) throw new NotImplementedException('Not Created');
  //   return { success: true, data: acct };
  // }

  // @Get(':user_id')
  // async findOne(@Param('user_id') user_id: string) {
  //   const settings = await this.accountSettingsService.findOne({ user_id });
  //   if (!settings) throw new NotFoundException('Not Found');
  //   return { success: true, data: settings };
  // }

  // @Patch(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateAccountSettingDto: UpdateAccountSettingDto,
  // ) {
  //   const updated = await this.accountSettingsService.update(+id, {
  //     ...updateAccountSettingDto,
  //   });
  //   if (!updated) throw new NotImplementedException('Not Updated');
  //   return { success: true, data: updated };
  // }
}
