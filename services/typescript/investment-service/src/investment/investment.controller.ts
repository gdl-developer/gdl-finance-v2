import { Controller, Post, Body, Get, Param, Patch, Req } from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentStatus } from '../entities/investment.entity';
import { FastifyRequest } from 'fastify';

@Controller('investment')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Post()
  create(@Body() dto: CreateInvestmentDto, @Req() req: FastifyRequest) {
    const userId = (req.headers['x-user-id'] as string) || 'test-user';
    return this.investmentService.create(userId, dto);
  }

  @Get()
  findAll(@Req() req: FastifyRequest) {
    const userId = (req.headers['x-user-id'] as string) || 'test-user';
    return this.investmentService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: FastifyRequest) {
    const userId = (req.headers['x-user-id'] as string) || 'test-user';
    return this.investmentService.findOne(+id, userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: InvestmentStatus,
    @Body('notes') notes?: string,
  ) {
    return this.investmentService.updateStatus(+id, status, notes);
  }
}
