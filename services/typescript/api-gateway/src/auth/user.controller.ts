import {
  Controller,
  Get,
  Delete,
  Patch,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from './interfaces/request.interface';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @Get('export-data')
  exportData(@Req() req: AuthenticatedRequest) {
    return this.authService.exportData(req.user.user_id);
  }

  @Delete('account')
  async deleteAccount(@Req() req: AuthenticatedRequest) {
    return this.authService.deleteAccount(req.user.user_id);
  }

  @Patch('consent')
  async updateConsent(@Req() req: AuthenticatedRequest, @Body() dto: any) {
    return this.authService.updateConsent(req.user.user_id, dto);
  }
}
