import { Controller, Post, Body, Get, Param, Patch, Req } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { FlexiRequestStatus } from '../entities/request.enums';
import { FastifyRequest } from 'fastify';
import { CreateFlexiRequestDto } from './dto/create-request.dto';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() dto: CreateFlexiRequestDto, @Req() req: FastifyRequest) {
    const userId = (req.headers['x-user-id'] as string) || 'test-user';
    return this.requestsService.createRequest(userId, dto);
  }

  @Get('my-requests')
  getMyRequests(@Req() req: FastifyRequest) {
    const userId = (req.headers['x-user-id'] as string) || 'test-user';
    return this.requestsService.findByUserId(userId);
  }

  @Get('pending')
  getPending() {
    return this.requestsService.findPending();
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: FlexiRequestStatus,
  ) {
    return this.requestsService.updateStatus(+id, status);
  }
}
