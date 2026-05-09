import {
  Controller,
  Get,
  UseGuards,
  Query,
  Req,
  Param,
  Post,
  Body,
  Delete,
  UnauthorizedException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlexiAdminService } from './flexi-admin.service';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { UserAccount } from 'src/user/user/entities/user.entity';
import { FlexiRequestStatus } from 'src/flexi/entities/flexi-request.enums';
import { InitiateExtensionDto } from 'src/flexi/dto/flexi-request.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { Request } from 'express';

@ApiTags('Admin Flexi')
@Controller('admin/flexi')
@UseGuards(AbilitiesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class FlexiAdminController {
  constructor(private readonly flexiAdminService: FlexiAdminService) {}

  @Get('requests/pending-approval')
  @ApiOperation({
    summary: 'Get requests pending approval for the logged-in admin',
  })
  @AuditLogger('GetPendingFlexiRequests')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getPendingRequests(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const user: any = req['user'];
      const adminId = user?.user_id || user?.staffId || user?.id;

      if (!adminId) {
        throw new UnauthorizedException('User ID not found');
      }

      const result = await this.flexiAdminService.getPendingRequestsForAdmin(
        adminId,
        {
          page,
          limit,
          search,
        },
      );

      return { success: true, ...result };
    } catch (error) {
      console.error('FlexiAdminController Error:', error);
      throw error;
    }
  }

  @Get('requests/all-pending')
  @ApiOperation({ summary: 'Get ALL requests pending approval (Global view)' })
  @AuditLogger('GetAllPendingFlexiRequests')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getAllPendingRequests(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.flexiAdminService.getAllPendingRequests({
        page,
        limit,
        search,
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('FlexiAdminController Error:', error);
      throw error;
    }
  }

  @Get('requests/status/:status')
  @ApiOperation({ summary: 'Get flexi requests by status' })
  @AuditLogger('GetFlexiRequestsByStatus')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getRequestsByStatus(
    @Param('status') status: FlexiRequestStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.flexiAdminService.getRequestsByStatus(status, {
        page,
        limit,
        search,
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('FlexiAdminController Error:', error);
      throw error;
    }
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get a single flexi request by ID' })
  @AuditLogger('GetFlexiRequestById')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getRequestById(@Param('id') id: string) {
    return this.flexiAdminService.getRequestById(Number(id));
  }

  @Get('requests/documents/:docId/url')
  @ApiOperation({ summary: 'Get a signed URL for a specific document' })
  @AuditLogger('GetFlexiDocumentUrl')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getDocumentUrl(@Param('docId') docId: string) {
    return this.flexiAdminService.getDocumentUrl(Number(docId));
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve a flexi request level' })
  @AuditLogger('ApproveFlexiRequest')
  @CheckAbilities({ action: Action.Update, subject: 'all' })
  async approveRequest(@Param('id') id: string, @Req() req: Request) {
    const user: any = req['user'];
    const adminId = user?.staffId || user?.user_id || user?.id;
    return this.flexiAdminService.approveRequest(Number(id), Number(adminId));
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject a flexi request' })
  @AuditLogger('RejectFlexiRequest')
  @CheckAbilities({ action: Action.Update, subject: 'all' })
  async rejectRequest(
    @Param('id') id: string,
    @Req() req: Request,
    @Body('reason') reason: string,
  ) {
    const user: any = req['user'];
    const adminId = user?.staffId || user?.user_id || user?.id;
    return this.flexiAdminService.rejectRequest(
      Number(id),
      Number(adminId),
      reason,
    );
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get all Flexi agents' })
  @AuditLogger('GetAllFlexiAgents')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getAgents(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.flexiAdminService.getAgents({
        page,
        limit,
        search,
      });
      return { success: true, ...result };
    } catch (error) {
      console.error('FlexiAdminController Error:', error);
      throw error;
    }
  }

  @Get('agents/:id')
  @ApiOperation({ summary: 'Get a single Flexi agent by ID' })
  @AuditLogger('GetFlexiAgentById')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getAgentById(@Param('id') id: string) {
    try {
      const result = await this.flexiAdminService.getAgentById(Number(id));
      return { success: true, ...result };
    } catch (error) {
      console.error('FlexiAdminController Error:', error);
      throw error;
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get Flexi request statistics' })
  @AuditLogger('GetFlexiStats')
  @CheckAbilities({ action: Action.Read, subject: 'all' })
  async getStats() {
    const data = await this.flexiAdminService.getStats();
    return { data };
  }

  @Post('requests/:id/initiate-extension')
  @ApiOperation({ summary: 'Initiate extension for a disbursed request' })
  @AuditLogger('InitiateFlexiExtension')
  @CheckAbilities({ action: Action.Update, subject: 'all' })
  async initiateExtension(
    @Param('id') id: string,
    @Body() dto: InitiateExtensionDto,
  ) {
    return this.flexiAdminService.initiateExtension(Number(id), dto);
  }

  @Post('requests/:id/confirm-payment')
  @ApiOperation({
    summary:
      'Confirm extension rate payment (Authorized Level 1 Approver only)',
  })
  @AuditLogger('ConfirmFlexiExtensionPayment')
  @CheckAbilities({ action: Action.Update, subject: 'all' })
  async confirmPayment(@Param('id') id: string, @Req() req: Request) {
    const user: any = req['user'];
    const adminId = user?.staffId || user?.user_id || user?.id;
    return this.flexiAdminService.confirmExtensionPayment(
      Number(id),
      Number(adminId),
    );
  }
}
