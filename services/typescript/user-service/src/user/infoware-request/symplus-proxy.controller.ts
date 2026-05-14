import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  Req,
  All,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ExternalApiCallsService } from 'src/common/external-api-calls/external-api-calls.service';
import { EnvService } from 'src/common/env.service';

@ApiTags('Legacy Symplus Proxy')
@Controller()
export class SymplusProxyController {
  private readonly logger = new Logger(SymplusProxyController.name);
  private readonly symplusBaseUrl: string;

  constructor(
    private readonly externalApiCallsService: ExternalApiCallsService,
    private readonly envService: EnvService,
  ) {
    const env = this.envService.read();
    const rawBaseUrl = env.SYMPLUS_SERVICE_BASE_URL;
    this.symplusBaseUrl = rawBaseUrl.endsWith('/')
      ? `${rawBaseUrl}symplus-service`
      : `${rawBaseUrl}/symplus-service`;
  }

  @All('symplus/api/requests/*')
  @ApiOperation({ summary: 'Proxy for legacy symplus requests' })
  async proxySymplus(
    @Req() req: Request,
    @Body() body: any,
    @Query() query: any,
  ) {
    const path = req.path;
    const url = `${this.symplusBaseUrl}${path}`;

    this.logger.log(`Proxying ${req.method} request to ${url}`);

    if (req.method === 'GET') {
      return this.externalApiCallsService.getData(url, null, query);
    } else if (req.method === 'POST') {
      return this.externalApiCallsService.postData(url, body);
    } else if (req.method === 'PATCH') {
      return this.externalApiCallsService.patchData(url, body);
    }
  }

  @All('infoweb-api/*')
  @ApiOperation({ summary: 'Proxy for legacy infoweb-api requests' })
  async proxyInfoweb(
    @Req() req: Request,
    @Body() body: any,
    @Query() query: any,
  ) {
    const path = req.path; // e.g. /infoweb-api/portfolio
    const url = `${this.symplusBaseUrl}${path}`;

    this.logger.log(`Proxying ${req.method} request to ${url}`);

    if (req.method === 'GET') {
      return this.externalApiCallsService.getData(url, null, query);
    } else if (req.method === 'POST') {
      return this.externalApiCallsService.postData(url, body);
    } else if (req.method === 'PATCH') {
      return this.externalApiCallsService.patchData(url, body);
    }
  }
}
