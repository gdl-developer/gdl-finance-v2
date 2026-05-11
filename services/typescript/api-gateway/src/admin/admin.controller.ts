import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Patch,
  Delete,
  Param,
  NotImplementedException,
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

  // --- Expected Missing Endpoints for V2 Admin ---

  @Get('txn/categories')
  @Permissions('TXN_CONFIG_VIEW')
  getTransactionCategories() {
    throw new NotImplementedException(
      'Transaction categories config migration is pending',
    );
  }

  @Get('fee/profiles')
  @Permissions('TXN_CONFIG_VIEW')
  getFeeProfiles() {
    throw new NotImplementedException(
      'Fee profiles config migration is pending',
    );
  }

  @Get('workflows')
  @Permissions('WORKFLOW_VIEW')
  getWorkflows() {
    throw new NotImplementedException('DMS Workflows migration is pending');
  }

  @Get('doc/signatories')
  @Permissions('DMS_VIEW')
  getSignatories() {
    throw new NotImplementedException('DMS Signatories migration is pending');
  }
}
