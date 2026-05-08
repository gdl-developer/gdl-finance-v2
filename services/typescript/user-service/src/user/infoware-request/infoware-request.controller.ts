import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InfowareService } from './infoware-request.service';
import { CreateCustomerDto, FundAccountDto } from './dto/create-customer.dto';
import { Request, Response } from 'express';

@ApiTags('User Service API')
@Controller('products')
export class InfowareController {
  private readonly logger = new Logger(InfowareController.name);

  constructor(private readonly infowareService: InfowareService) {}

  // -------------------
  // Health
  // -------------------
  @Get('health')
  @ApiOperation({ summary: 'User Service Health Check' })
  async healthCheck() {
    return this.infowareService.healthCheck();
  }

  // -------------------
  // Customer
  // -------------------
  @Post('customers')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create Customer via User Service' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.infowareService.createCustomer(dto);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get Customer Info via User Service' })
  async getCustomerInfo(
    @Param('customerId') customerId: number,
    @Query('infoCode') infoCode?: number,
  ) {
    return this.infowareService.getCustomerInfo(customerId, infoCode);
  }

  @Get('customer/:customerId/transactions')
  @ApiOperation({ summary: 'Get Customer Transactions via User Service' })
  async getCustomerTransactions(@Param('customerId') customerId: number) {
    return this.infowareService.getCustomerTransactions(customerId);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get Customer Valuation' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Fund code (canary | income)',
  })
  async getProductEvaluation(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    let actualCode: string;
    // Map incoming codes to real fund codes
    if (code === 'canary') {
      actualCode = 'CGF';
    } else if (code === 'income') {
      actualCode = 'AIF';
    } else if (code === 'money' || code === 'moneymarket') {
      actualCode = 'mmf';
    } else {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Invalid fund code: ${code}. Expected: canary | income | money`,
      });
    }

    const resp = await this.infowareService.valuation(actualCode);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Customer valuation fetched successfully',
      data: resp,
    });
  }

  // -------------------
  // Portfolio & Products
  // -------------------
  @Get('portfolio')
  @ApiOperation({ summary: 'Get Portfolio Position via User Service' })
  async getPortfolioPosition(@Query('params') params?: string) {
    return this.infowareService.getPortfolioPosition(params);
  }

  @Get('products')
  @ApiOperation({ summary: 'List Products via User Service' })
  async listProducts() {
    return this.infowareService.listProducts();
  }

  // -------------------
  // Fund Account
  // -------------------
  @Get('fund-account')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Fund Account via User Service' })
  async fundAccount(@Query() query: FundAccountDto) {
    return this.infowareService.fundAccount(query);
  }

  // -------------------
  // Logout
  // -------------------
  @Get('logout')
  @ApiOperation({ summary: 'Logout via User Service' })
  async logout() {
    return this.infowareService.logout();
  }
}
