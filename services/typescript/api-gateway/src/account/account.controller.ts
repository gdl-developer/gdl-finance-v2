import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AccountService } from './account.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/request.interface';
import { firstValueFrom } from 'rxjs';

@Controller('virtual-wallet')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async getWallets(@Req() req: AuthenticatedRequest) {
    const bankone = await firstValueFrom(
      this.accountService.getBankOneBalance(req.user.user_id),
    );
    const uba = await firstValueFrom(
      this.accountService.getUBABalance(req.user.user_id),
    );
    const rmb = await firstValueFrom(
      this.accountService.getRMBBalance(req.user.user_id),
    );

    return {
      success: true,
      message: 'Virtual wallets retrieved successfully',
      data: [bankone, uba, rmb],
    };
  }

  @Get('bankone/balance')
  getBankOneBalance(@Req() req: AuthenticatedRequest) {
    return this.accountService.getBankOneBalance(req.user.user_id);
  }

  @Get('uba/balance')
  getUBABalance(@Req() req: AuthenticatedRequest) {
    return this.accountService.getUBABalance(req.user.user_id);
  }

  @Get('rmb/balance')
  getRMBBalance(@Req() req: AuthenticatedRequest) {
    return this.accountService.getRMBBalance(req.user.user_id);
  }

  @Get('virtual-accounts')
  getVirtualAccounts(@Req() req: AuthenticatedRequest) {
    return this.accountService.getVirtualAccounts(req.user.user_id);
  }

  @Post('virtual-accounts')
  createVirtualAccount(
    @Req() req: AuthenticatedRequest,
    @Body('bvn') bvn: string,
  ) {
    return this.accountService.createVirtualAccount(req.user.user_id, bvn);
  }

  @Get('transactions')
  getTransactions(@Req() req: AuthenticatedRequest) {
    return this.accountService.getTransactions(req.user.user_id);
  }
}
