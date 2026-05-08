import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/request.interface';

@Controller('infoweb-api')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get('products')
  getProducts() {
    return this.investmentService.getMutualFunds();
  }

  @Get('valuation')
  getValuation(@Query('code') code: string) {
    return this.investmentService.getPrice(code);
  }

  @UseGuards(AuthGuard)
  @Get('portfolio')
  getPortfolio(@Req() req: AuthenticatedRequest) {
    // In legacy, customerId might be stored in a metadata field or user profile
    return this.investmentService.getCustomerInvestments(req.user.user_id);
  }

  @UseGuards(AuthGuard)
  @Post('subscribe')
  subscribe(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.investmentService.subscribe({
      customer_id: req.user.user_id,
      ...body,
    });
  }

  @UseGuards(AuthGuard)
  @Post('redeem')
  redeem(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.investmentService.redeem({
      customer_id: req.user.user_id,
      ...body,
    });
  }
}
