import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from './interfaces/request.interface';

@Controller('kyc')
@UseGuards(AuthGuard)
export class KycController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getKycStatus(@Req() req: AuthenticatedRequest) {
    return this.authService.getKycStatus(req.user.user_id);
  }

  @Patch(':id')
  upgradeKyc(@Req() req: AuthenticatedRequest, @Body('target_level') level: number) {
    return this.authService.upgradeKyc(req.user.user_id, level);
  }
}
