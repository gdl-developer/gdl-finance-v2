import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { FlexiService } from './flexi.service';
import { FastifyRequest } from 'fastify';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('flexi')
export class FlexiController {
  constructor(private readonly flexiService: FlexiService) {}

  @Post('agent/login')
  agentLogin(@Body() dto: any, @Req() req: FastifyRequest) {
    return this.flexiService.proxyRequest(
      'post',
      '/agent/login',
      dto,
      req.headers,
    );
  }

  @UseGuards(AuthGuard)
  @Post('requests')
  createRequest(@Body() dto: any, @Req() req: any) {
    // Inject user_id from auth guard into headers for downstream service
    const headers = { ...req.headers, 'x-user-id': req.user.user_id };
    return this.flexiService.proxyRequest('post', '/requests', dto, headers);
  }

  @UseGuards(AuthGuard)
  @Get('requests')
  getRequests(@Req() req: any) {
    const headers = { ...req.headers, 'x-user-id': req.user.user_id };
    return this.flexiService.proxyRequest('get', '/requests', null, headers);
  }
}
