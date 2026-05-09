import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchHisDto } from './dto/search-hisroty.dto';
import { LoginHistoryService } from './login-history.service';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { LoginHistory } from './entities/login-history.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Login History')
@Controller('login/history')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: LoginHistory })
  @AuditLogger('GetAllLoginHistory')
  async getAllLoginHistory() {
    const his = await this.loginHistoryService.findAll();
    return { data: his };
  }

  @Get('user/:user_id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: LoginHistory })
  @AuditLogger('GetUserLoginHistory')
  async findUserLoginHistory(
    @Param('user_id') user_id: string,
    @Query() searchHisDto: SearchHisDto,
  ) {
    const { page, per_page, ...query } = searchHisDto;
    const his = await this.loginHistoryService.userLoginHistory(
      page,
      per_page,
      user_id,
      query,
    );
    return { data: his };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: LoginHistory })
  @AuditLogger('GetOneLoginHistory')
  async findOne(@Param('id') id: string) {
    const his = await this.loginHistoryService.findOne(+id);
    return { data: his };
  }
}
