import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/request.interface';

@Controller('transfers')
@UseGuards(AuthGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post('internal')
  transferInternal(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.transferService.transferInternal({
      from_user_id: req.user.user_id,
      ...body,
    });
  }

  @Post('bank')
  transferBank(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.transferService.transferBank({
      from_user_id: req.user.user_id,
      ...body,
    });
  }

  @Get('history')
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.transferService.getHistory(req.user.user_id);
  }

  @Get('banks')
  getBanks() {
    return this.transferService.getBankList();
  }

  @Post('enquiry')
  enquiry(@Body() body: any) {
    return this.transferService.accountEnquiry(
      body.bank_code,
      body.account_number,
    );
  }

  @Get('status/:reference')
  async getStatus(
    @Param('reference') reference: string,
    @Query('date') date: string,
    @Query('amount') amount: string,
  ) {
    return this.transferService.transactionStatusQuery(
      reference,
      date,
      parseFloat(amount),
    );
  }
}
