import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { CreateApprovalWorkflowDto } from './dto/create-approval-workflow.dto';
import { UpdateApprovalWorkflowDto } from './dto/update-approval-workflow.dto';
import { QueryApprovalWorkflowDto } from './dto/query-approval-workflow.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AbilitiesGuard } from '../../common/casl-ability-rbac/abilities.guard';
import { CheckAbilities } from '../../common/casl-ability-rbac/abilities.decorator';
import { Action } from '../../common/casl-ability-rbac/ability.factory';
import { Admin } from '../admin/entities/admin.entity';
import { AuditLogger } from '../../common/audit-logger/utils/audit-log.decorator';

@ApiTags('Admin - Approval Workflows')
@ApiBearerAuth()
@UseGuards(AbilitiesGuard, ThrottlerGuard)
@Controller('admin/approval-workflows')
export class ApprovalWorkflowController {
  constructor(
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  @Post()
  @CheckAbilities({ action: Action.Create, subject: Admin })
  @AuditLogger('CreateApprovalWorkflow')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new approval workflow' })
  @ApiResponse({
    status: 201,
    description: 'The workflow has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate workflow name.',
  })
  @ApiResponse({
    status: 409,
    description: 'A workflow with this name already exists.',
  })
  create(
    @Body() createApprovalWorkflowDto: CreateApprovalWorkflowDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.staffId;
    return this.approvalWorkflowService.create(
      createApprovalWorkflowDto,
      currentUserId,
    );
  }

  @Get()
  @CheckAbilities({ action: Action.Read, subject: Admin })
  @AuditLogger('GetAllApprovalWorkflows')
  @ApiOperation({ summary: 'List all approval workflows with pagination' })
  @ApiResponse({ status: 200, description: 'Return paginated workflows.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field (id, name, createdAt, updatedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by workflow name',
  })
  findAll(@Query() query: QueryApprovalWorkflowDto) {
    return this.approvalWorkflowService.findAll(
      query.page,
      query.limit,
      query.sortBy,
      query.sortOrder,
      query.search,
    );
  }

  @Get(':id')
  @CheckAbilities({ action: Action.Read, subject: Admin })
  @AuditLogger('GetApprovalWorkflow')
  @ApiOperation({ summary: 'Get a specific approval workflow' })
  @ApiResponse({ status: 200, description: 'Return the workflow.' })
  @ApiResponse({ status: 404, description: 'Workflow not found.' })
  findOne(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
  ) {
    return this.approvalWorkflowService.findOne(id);
  }

  @Patch(':id')
  @CheckAbilities({ action: Action.Update, subject: Admin })
  @AuditLogger('UpdateApprovalWorkflow')
  @ApiOperation({ summary: 'Update an approval workflow' })
  @ApiResponse({
    status: 200,
    description: 'The workflow has been successfully updated.',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiResponse({ status: 404, description: 'Workflow not found.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: 409,
    description: 'A workflow with this name already exists.',
  })
  update(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
    @Body() updateApprovalWorkflowDto: UpdateApprovalWorkflowDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.staffId;
    return this.approvalWorkflowService.update(
      id,
      updateApprovalWorkflowDto,
      currentUserId,
    );
  }

  @Delete(':id')
  @CheckAbilities({ action: Action.Delete, subject: Admin })
  @AuditLogger('DeleteApprovalWorkflow')
  @ApiOperation({ summary: 'Soft delete an approval workflow' })
  @ApiResponse({
    status: 200,
    description: 'The workflow has been successfully deleted (soft delete).',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiResponse({ status: 404, description: 'Workflow not found.' })
  remove(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.staffId;
    return this.approvalWorkflowService.remove(id, currentUserId);
  }

  @Post('system/cleanup')
  @CheckAbilities({ action: Action.Update, subject: Admin })
  @AuditLogger('CleanupApprovalWorkflowLegacyData')
  @ApiOperation({ summary: 'System cleanup for legacy data invalid IDs' })
  async runCleanup() {
    return this.approvalWorkflowService.runDatabaseCleanup();
  }
}
