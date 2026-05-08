import {
  Controller,
  Get,
  Post,
  Body,
  // Patch,
  Param,
  Delete,
  NotImplementedException,
  UseGuards,
  ParseIntPipe,
  Query,
  NotFoundException,
  ForbiddenException,
  NotAcceptableException,
  InternalServerErrorException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { PasswordResetDto } from 'src/user/auth/dto/reset-password.dto';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { UserAccount } from 'src/user/user/entities/user.entity';
import { UpdateAdminDto } from './dto/update-admin.dto';

// import { FlexiService } from 'src/flexi/flexi.service';

@ApiTags('Admin')
@UseGuards(AbilitiesGuard)
@CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
@UseInterceptors(ClassSerializerInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @AuditLogger('CreateAdmin')
  // @UseGuards(AbilitiesGuard)
  // @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  async create(@Body() createAdminDto: CreateAdminDto) {
    const admin = await this.adminService.createAdmin(createAdminDto);
    return { success: true, data: admin };
  }

  @Get()
  @AuditLogger('GetAllAdmin')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  async findAll(@Query() query: any) {
    const admin = await this.adminService.findAllAdmin(query);
    // remove all admin passwords here
    return { success: true, data: admin };
  }

  @Get('approvers')
  @AuditLogger('GetAllApprovers')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  async findApprovers() {
    const approvers = await this.adminService.getApprovers();
    return { success: true, data: approvers };
  }

  @Get(':id(\\d+)')
  @AuditLogger('GetAdmin')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const admin = await this.adminService.getUser(id);

    return { success: true, data: admin };
  }

  @Get('r/referer/:referal_code')
  @AuditLogger('GetAdminByReferalCode')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  async findAdminByRedralCode(@Param('referal_code') referal_code: string) {
    const admin = await this.adminService.findUserByReferalCode(referal_code);

    return { success: true, data: admin };
  }

  @Post('password/reset')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: 'all' })
  @AuditLogger('ResetPassword')
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    try {
      const reset = await this.adminService.resetPassword(passwordResetDto);
      return { success: true, data: reset };
    } catch (error) {
      if (
        error instanceof NotAcceptableException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Reset Request Failed',
      );
    }
  }

  @Post(':id(\\d+)/password/regenerate')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: UserAccount })
  @AuditLogger('RegenerateAdminPassword')
  async regeneratePassword(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.adminService.regenerateAdminPassword(id);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Regeneration Failed',
      );
    }
  }

  @Get('toggle/:id(\\d+)')
  @AuditLogger('ToggleAdminActiveStatus')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: UserAccount })
  async toggle(@Param('id', ParseIntPipe) id: number) {
    const admin = await this.adminService.toggle(id);

    return { success: true, data: admin };
  }

  @Post(':id(\\d+)')
  @AuditLogger('UpdateAdmin')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: UserAccount })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    const admin = await this.adminService.update(id, updateAdminDto);
    return { success: true, data: admin };
  }

  @Post('data/purge-all-records')
  // @UseGuards(AbilitiesGuard)
  // @CheckAbilities({ action: Action.Manage, subject: UserAccount })
  @AuditLogger('DeleteAllRecords')
  async deleteAllRecords() {
    const result = await this.adminService.deleteAllRecords();
    return result;
  }

  @Delete(':id(\\d+)')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: UserAccount }) // Updated action to Manage for deletion
  @AuditLogger('RemoveAdmin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const admin = await this.adminService.deleteAdmin(id);
    return { success: true, data: admin };
  }
}
