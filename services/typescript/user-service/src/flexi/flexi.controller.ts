import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Query,
  UseInterceptors,
  UploadedFile,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditLogger } from '../common/audit-logger/utils/audit-log.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FlexiService } from './flexi.service';
import {
  CreateFlexiRequestDto,
  UpdateFlexiRequestStatusDto,
  InitiateExtensionDto,
  ConfirmExtensionPaymentDto,
} from './dto/flexi-request.dto';
import { CreateFlexiAgentDto, AgentLoginDto } from './dto/create-agent.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { UpdateFlexiProfileDto } from './dto/update-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from '../admin/admin/entities/admin.entity';
import { Public } from '../common/decorators/public.decorator';
import { FlexiAuthGuard } from './guards/flexi-auth.guard';

@ApiTags('Flexi Automation')
@Controller('flexi')
@UseGuards(FlexiAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class FlexiController {
  constructor(private readonly flexiService: FlexiService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Create a new Flexi Request (Funding/Recall)' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  async createRequest(@Body() dto: CreateFlexiRequestDto, @Req() req: Request) {
    const user = req['user'];
    if (!user) throw new UnauthorizedException();

    // In a real scenario, we might fetch the full user entity if 'user' on req is just the token payload
    // For MVP, we pass the user entity or ID. The service expects UserAccount.
    const request = await this.flexiService.createRequest(user, dto);
    return { data: request };
  }

  @Get('requests/my-requests')
  @ApiOperation({ summary: 'Get all requests for the logged-in user' })
  async getUserRequests(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const user: any = req['user']; // Set by FlexiAuthGuard
    const result = await this.flexiService.getUserRequests(user, {
      page,
      limit,
      search,
      status,
    });
    return { data: result.data, meta: result.meta };
  }

  @Get('requests/pending-approval')
  @ApiOperation({
    summary: 'Get requests pending approval for the logged-in admin',
  })
  async getPendingRequests(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const user: any = req['user'];
      console.log('FlexiController: User Payload:', JSON.stringify(user));

      const adminId = user?.user_id || user?.staffId || user?.id;
      console.log('FlexiController: Extracted Admin ID:', adminId);

      if (!adminId) {
        console.error('FlexiController: Admin ID missing from payload');
        throw new UnauthorizedException('User ID not found');
      }

      const result = await this.flexiService.getPendingRequestsForAdmin(
        adminId,
        {
          page,
          limit,
          search,
        },
      );
      return { data: result.data, meta: result.meta };
    } catch (error) {
      console.error('FlexiController Error:', error);
      throw error; // Re-throw to let global filter handle it, but logged now.
      // Or explicitly return format:
      // return { success: false, message: error.message, stack: error.stack };
    }
  }

  @Get('debug/diagnose')
  @ApiOperation({ summary: 'Diagnose pending requests visibility' })
  async diagnoseRequests(@Req() req: Request) {
    const user: any = req['user'];
    const adminId = user?.user_id || user?.staffId || user?.id;
    return this.flexiService.diagnosePendingRequests(adminId);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get request details' })
  async getRequest(@Param('id') id: number) {
    const request = await this.flexiService.getRequestById(id);
    return { data: request };
  }

  @Get('agent/request-detail/:id')
  @ApiOperation({ summary: 'Get request details (Alias for Agent)' })
  async getAgentRequestDetail(@Param('id') id: number) {
    return this.getRequest(id);
  }

  @Post('verify-bvn')
  @ApiOperation({ summary: 'Verify BVN via QuoreID' })
  async verifyBvn(
    @Body() body: { bvn: string; firstname: string; lastname: string },
  ) {
    const result = await this.flexiService.verifyCustomerBvn(body.bvn, {
      firstname: body.firstname,
      lastname: body.lastname,
    });

    if (!result?.status?.verified) {
      throw new BadRequestException(
        'BVN validation failed. Please ensure the provided details match your BVN records.',
      );
    }

    return { data: result };
  }

  @Patch('requests/:id/approve')
  @AuditLogger('Approve/Reject Flexi Request')
  // @Roles(UserType.ADMIN) // TODO: Implement RBAC with AdminRole entity
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or Reject a request (Admin only)' })
  async updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateFlexiRequestStatusDto,
    @Req() req: Request,
  ) {
    const user: any = req['user']; // Set by FlexiAuthGuard
    const adminId = user?.user_id;
    const result = await this.flexiService.updateStatus(id, adminId, dto);
    return { data: result };
  }

  @Post('requests/:id/initiate-extension')
  @AuditLogger('Initiate Flexi Tenure Extension')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate extension for a disbursed request' })
  async initiateExtension(
    @Param('id') id: number,
    @Body() dto: InitiateExtensionDto,
  ) {
    const result = await this.flexiService.initiateExtension(id, dto);
    return { data: result };
  }

  @Post('requests/:id/confirm-extension-payment')
  @AuditLogger('Confirm Flexi Extension Payment')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Confirm extension rate payment (Authorized Level 1 Approver only)',
  })
  async confirmExtensionPayment(@Param('id') id: number, @Req() req: Request) {
    const user: any = req['user'];
    const adminId = user?.user_id;
    const result = await this.flexiService.confirmExtensionPayment(id, adminId);
    return { data: result };
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate S3 Presigned Upload URL' })
  async generateUploadUrl(
    @Body() body: { fileName: string; contentType: string },
  ) {
    const result = await this.flexiService.generateUploadUrl(
      body.fileName,
      body.contentType,
    );
    return { data: result };
  }

  @Post('upload-document')
  @ApiOperation({ summary: 'Upload document file and get secure URL' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() body: { documentType: string },
    @Req() req: Request,
  ) {
    const user: any = req['user'];
    if (!user) throw new UnauthorizedException('Authentication required');

    if (!file) {
      throw new UnauthorizedException('No file uploaded');
    }

    const result = await this.flexiService.uploadDocument(
      file,
      body.documentType,
      user,
    );
    return { data: result };
  }

  // --- Agent Endpoints ---

  @Post('agent/create')
  @Public()
  @ApiOperation({ summary: 'Create a new Flexi Agent' })
  async createAgent(@Body() dto: CreateFlexiAgentDto) {
    const result = await this.flexiService.createAgent(dto);
    return { data: result };
  }

  @Post('agent/verify-email')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 900000 } }) // 20 requests per 15 minutes (Relaxed from 5)
  @ApiOperation({ summary: 'Verify Agent Email with OTP' })
  async verifyEmail(@Body() dto: { email: string; otp: string }) {
    const result = await this.flexiService.verifyEmail(dto);
    return { data: result };
  }

  @Post('agent/resend-otp')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 requests per 15 minutes (Relaxed from 3)
  @ApiOperation({ summary: 'Resend OTP to Agent Email' })
  async resendOtp(@Body() dto: { email: string }) {
    const result = await this.flexiService.resendOtp(dto);
    return { data: result };
  }

  @Post('agent/login')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 3600000 } }) // 30 login attempts per hour (Relaxed from 10)
  @ApiOperation({ summary: 'Login Agent' })
  async loginAgent(@Body() dto: AgentLoginDto, @Req() req: Request) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.flexiService.loginAgent(dto, ip, userAgent);
    return { data: result };
  }

  @Post('agent/refresh-token')
  @Public()
  @ApiOperation({ summary: 'Refresh Agent Token' })
  async refreshAgentToken(@Body() dto: { refreshToken: string }) {
    const result = await this.flexiService.refreshAgentToken(dto.refreshToken);
    return { data: result };
  }

  @Post('agent/forgot-password')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 requests per hour (Relaxed from 3)
  @ApiOperation({ summary: 'Request Password Reset OTP' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.flexiService.forgotPassword(dto);
    return { data: result };
  }

  @Post('agent/reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset Password with OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.flexiService.resetPassword(dto);
    return { data: result };
  }

  @Get('agent/login-history')
  @ApiOperation({ summary: 'Get Agent Login History' })
  async getLoginHistory(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const user: any = req['user'];
    // Ensure user is an agent (RBAC check or guard context)
    // For MVP, assuming the token belongs to the requesting agent
    const result = await this.flexiService.getLoginHistory(
      user.id || user.user_id,
      page,
      limit,
    ); // Flexi token payload uses 'id' usually
    return { data: result.data, meta: result.meta };
  }

  @Get('agent/profile')
  @ApiOperation({ summary: 'Get Agent Profile' })
  async getProfile(@Req() req: Request) {
    const user: any = req['user'];
    const agentId = user?.user_id || user?.sub || user?.id;

    if (!agentId)
      throw new UnauthorizedException('Invalid token: missing user identifier');

    const result = await this.flexiService.getAgentProfile(Number(agentId));
    return { data: result };
  }

  @Patch('agent/profile')
  @AuditLogger('Update Flexi Agent Profile')
  @ApiOperation({ summary: 'Update Agent Profile' })
  async updateProfile(
    @Body() body: { data: UpdateFlexiProfileDto },
    @Req() req: Request,
  ) {
    const user: any = req['user'];
    const agentEmail = user?.username; // Set in signAgentToken payload
    if (!agentEmail)
      throw new UnauthorizedException('Invalid token: missing identifier');

    const result = await this.flexiService.updateProfile(agentEmail, body.data);
    return { data: result };
  }

  @Patch('agent/change-password')
  @ApiOperation({ summary: 'Change Agent Password' })
  async changePassword(@Body() dto: any, @Req() req: Request) {
    const user: any = req['user'];
    const agentId = user?.user_id || user?.sub || user?.id;
    if (!agentId) throw new UnauthorizedException('Authentication required');

    const result = await this.flexiService.changePassword(Number(agentId), dto);
    return { data: result };
  }

  @Get('agent/dashboard-stats')
  @ApiOperation({ summary: 'Get Dashboard Statistics for Agent' })
  async getDashboardStats(@Req() req: Request) {
    const user: any = req['user'];
    const agentId = user?.user_id;

    if (!agentId) throw new UnauthorizedException('Authentication required');

    const result = await this.flexiService.getDashboardStats(Number(agentId));
    return { data: result };
  }

  @Get('agent/transactions')
  @ApiOperation({ summary: 'Get Agent Transactions' })
  async getAgentTransactions(
    @Req() req: Request,
    @Query()
    query: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const user: any = req['user'];
    const agentId = user?.user_id;

    if (!agentId) throw new UnauthorizedException('Authentication required');

    const result = await this.flexiService.getAgentTransactions(
      Number(agentId),
      { status: query.status, page: query.page, limit: query.limit },
    );
    return { data: result };
  }

  @Get('marketers')
  @Public()
  @ApiOperation({ summary: 'Get list of active GDL Marketers' })
  async getMarketers() {
    const result = await this.flexiService.getMarketers();
    return { data: result };
  }

  @Post('marketers')
  @Public()
  @ApiOperation({ summary: 'Create a new GDL Marketer (Account Officer)' })
  async createMarketer(
    @Body()
    body: {
      first_name: string;
      last_name: string;
      email: string;
      code?: string;
      phone_number?: string;
      office_branch_name?: string;
      office_branch_id?: number;
    },
  ) {
    const result = await this.flexiService.createMarketer(body);
    return { data: result };
  }

  @Patch('marketers/:id')
  @Public()
  @ApiOperation({ summary: 'Update a GDL Marketer (Account Officer)' })
  async updateMarketer(
    @Param('id') id: string,
    @Body()
    body: {
      first_name?: string;
      last_name?: string;
      email?: string;
      code?: string;
      phone_number?: string;
      office_branch_name?: string;
      office_branch_id?: number;
    },
  ) {
    const result = await this.flexiService.updateMarketer(Number(id), body);
    return { data: result };
  }

  @Delete('marketers/:id')
  @Public()
  @ApiOperation({ summary: 'Delete a GDL Marketer (Account Officer)' })
  async deleteMarketer(@Param('id') id: string) {
    await this.flexiService.deleteMarketer(Number(id));
    return { message: 'Marketer deleted successfully' };
  }
}
