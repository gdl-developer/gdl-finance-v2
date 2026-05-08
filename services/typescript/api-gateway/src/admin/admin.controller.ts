import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Post('roles')
  @Permissions('ROLE_MANAGE')
  createRole(@Body() data: any) {
    return this.authService.createRole(data);
  }

  @Post('users/assign-role')
  @Permissions('USER_MANAGE')
  assignRole(@Body() data: any) {
    return this.authService.assignRole(data);
  }

  @Get('roles')
  @Permissions('ROLE_VIEW')
  getRoles() {
    return this.authService.getRoles();
  }

  @Post('business-units')
  @Permissions('BUSINESS_UNIT_MANAGE')
  createBusinessUnit(@Body() data: any) {
    return this.authService.createBusinessUnit(data);
  }

  @Get('business-units')
  @Permissions('BUSINESS_UNIT_VIEW')
  getBusinessUnits() {
    return this.authService.getBusinessUnits();
  }

  @Patch('business-units/:id')
  @Permissions('BUSINESS_UNIT_MANAGE')
  updateBusinessUnit(@Param('id') id: string, @Body() data: any) {
    return this.authService.updateBusinessUnit(id, data);
  }

  @Delete('business-units/:id')
  @Permissions('BUSINESS_UNIT_MANAGE')
  deleteBusinessUnit(@Param('id') id: string) {
    return this.authService.deleteBusinessUnit(id);
  }
}
