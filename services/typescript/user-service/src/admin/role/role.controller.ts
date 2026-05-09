import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateAdminRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiTags } from '@nestjs/swagger';
import { Like } from 'typeorm';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { Admin } from '../admin/entities/admin.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { AdminRole } from './entities/role.entity';

@ApiTags('Admin Role')
@Controller('admin/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Permissions('role:create')
  @Post()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: Admin })
  @AuditLogger('CreateAdminRole')
  async create(@Body() createRoleDto: CreateAdminRoleDto) {
    const role = await this.roleService.create(createRoleDto);
    return { success: true, data: role };
  }

  @Permissions('role:list')
  @Get('all')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: Admin })
  @AuditLogger('GetAdminRoles')
  async findAll(@Query('search_str') search_str: string) {
    let where_boj;
    if (search_str !== undefined && search_str !== null) {
      where_boj = { name: Like(`%${search_str}%`) };
    } else {
      where_boj = {};
    }
    const role = await this.roleService.findAllV2(['permissions'], where_boj);
    return { success: true, data: role };
  }

  @Permissions('role:view')
  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: AdminRole })
  @AuditLogger('GetAdminRole')
  async findOne(@Param('id') id: string) {
    const role = await this.roleService.findOne(+id, ['permissions']);
    return { success: true, data: role };
  }

  @Permissions('role:edit')
  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: AdminRole })
  @AuditLogger('UpdateAdminRole')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.roleService.update(+id, updateRoleDto);
    return { success: true, data: role };
  }

  @Permissions('role:delete')
  @Delete(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Delete, subject: AdminRole })
  @AuditLogger('RemoveAdminRole')
  async remove(@Param('id') id: string) {
    const role = await this.roleService.remove(+id);
    return { success: true, data: role };
  }
}
