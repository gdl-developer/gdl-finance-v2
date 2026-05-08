import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { AdminPermission } from './entities/permission.entity';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Admin Permissions')
@Controller('admin/permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: AdminPermission })
  @AuditLogger('CreateAdminPermission')
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    const perms = await this.permissionService.create(createPermissionDto);
    return { success: true, data: perms };
  }

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: AdminPermission })
  @AuditLogger('GetAdminPermissions')
  async findAll() {
    const perms = await this.permissionService.findAllV2();
    return { success: true, data: perms };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: AdminPermission })
  @AuditLogger('GetAdminPermission')
  async findOne(@Param('id') id: string) {
    const perms = await this.permissionService.findOne(+id);
    if (!perms) {
      throw new NotFoundException('Not Found');
    }
    return { success: true, data: perms };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: AdminPermission })
  @AuditLogger('UpdateAdminPermission')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    const perms = await this.permissionService.update(+id, updatePermissionDto);
    return { success: true, data: perms };
  }

  @Delete(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Delete, subject: AdminPermission })
  @AuditLogger('RemoveAdminPermission')
  async remove(@Param('id') id: string) {
    return this.permissionService.remove(+id);
  }
}
