import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';
import { ApprovalWorkflowStep } from './entities/approval-workflow-step.entity';
import { CreateApprovalWorkflowDto } from './dto/create-approval-workflow.dto';
import { UpdateApprovalWorkflowDto } from './dto/update-approval-workflow.dto';
import { Admin } from '../admin/entities/admin.entity';

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  constructor(
    @InjectRepository(ApprovalWorkflow)
    private readonly workflowRepository: Repository<ApprovalWorkflow>,
    @InjectRepository(ApprovalWorkflowStep)
    private readonly stepRepository: Repository<ApprovalWorkflowStep>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly connection: Connection,
  ) {}

  async create(
    createWorkflowDto: CreateApprovalWorkflowDto,
    currentUserId?: number,
  ): Promise<any> {
    const { workflow_name, module, description, steps } = createWorkflowDto;

    // Check for duplicate workflow names (include soft-deleted — they still hold the unique index)
    const existingWorkflowByName = await this.workflowRepository.findOne({
      where: { workflow_name },
      withDeleted: true,
    });

    if (existingWorkflowByName) {
      this.logger.warn(
        `Attempt to create workflow with duplicate name: ${workflow_name}`,
      );
      throw new ConflictException('A workflow with this name already exists');
    }

    // Check for duplicate module assignment (only among active workflows)
    const existingWorkflowByModule = await this.workflowRepository.findOne({
      where: { module, isActive: true },
    });

    if (existingWorkflowByModule) {
      this.logger.warn(
        `Attempt to create duplicate workflow for module: ${module}`,
      );
      throw new ConflictException(
        `A workflow already exists for the ${module} module`,
      );
    }

    // Validate steps uniqueness and levels
    const levels = steps.map((s) => s.level);
    if (new Set(levels).size !== levels.length) {
      this.logger.warn('Duplicate levels found in workflow steps');
      throw new BadRequestException('Duplicate levels found in workflow steps');
    }

    // Validate all levels are positive
    if (levels.some((level) => level < 1)) {
      this.logger.warn('Invalid level values detected (must be positive)');
      throw new BadRequestException('All step levels must be positive numbers');
    }

    // Validate admin IDs are present before opening a connection
    const adminIds = steps.map((s) => s.admin_id);
    if (adminIds.some((id) => id == null || isNaN(id))) {
      this.logger.warn(
        'Invalid admin_id values detected (null, undefined, or NaN)',
      );
      throw new BadRequestException('All steps must have valid admin IDs');
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate admins using the queryRunner connection (avoids acquiring a second pool connection)
      const admins = await queryRunner.manager
        .createQueryBuilder(Admin, 'admin')
        .where('admin.staffId IN (:...adminIds)', { adminIds })
        .andWhere('admin.account_status = :status', { status: 'ACTIVE' })
        .getMany();

      if (admins.length !== adminIds.length) {
        const foundIds = admins.map((a) => a.staffId);
        const missingIds = adminIds.filter((id) => !foundIds.includes(id));
        this.logger.warn(
          `Admin IDs not found or inactive: ${missingIds.join(', ')}`,
        );
        throw new BadRequestException(
          'One or more admins not found or inactive',
        );
      }

      const workflow = this.workflowRepository.create({
        workflow_name,
        module,
        description,
        createdBy: currentUserId,
        isActive: true,
      });

      const savedWorkflow = await queryRunner.manager.save(workflow);
      this.logger.log(
        `Created workflow: ${savedWorkflow.id} - ${workflow_name}`,
      );

      const workflowSteps: ApprovalWorkflowStep[] = [];
      for (const stepDto of steps) {
        const admin = admins.find((a) => a.staffId === stepDto.admin_id);

        const step = this.stepRepository.create({
          workflow: savedWorkflow,
          admin,
          level: stepDto.level,
          enforce_branch_restriction:
            stepDto.enforce_branch_restriction || false,
          createdBy: currentUserId,
        });

        workflowSteps.push(step);
      }

      await queryRunner.manager.save(workflowSteps);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully created workflow ${savedWorkflow.id} with ${workflowSteps.length} steps`,
      );

      return await this.findOne(savedWorkflow.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create workflow: ${err.message}`, err.stack);

      // Re-throw known exceptions
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }

      // Sanitize error message for unexpected errors
      throw new InternalServerErrorException(
        'Failed to create approval workflow',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryBuilder = this.workflowRepository
        .createQueryBuilder('workflow')
        .leftJoinAndSelect('workflow.steps', 'step')
        .leftJoinAndSelect('step.admin', 'admin')
        .leftJoinAndSelect('admin.roles', 'roles')
        .leftJoinAndSelect('admin.business_unit', 'business_unit')
        .leftJoinAndSelect('admin.office_branch', 'office_branch')
        .where('workflow.isActive = :isActive', { isActive: true })
        .andWhere('(step.id IS NULL OR step.adminId IS NOT NULL)');

      // Add search filter if provided
      if (search) {
        queryBuilder.andWhere('workflow.workflow_name LIKE :search', {
          search: `%${search}%`,
        });
      }

      // Validate and apply sorting
      const allowedSortFields = [
        'id',
        'workflow_name',
        'createdAt',
        'updatedAt',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
      queryBuilder.orderBy(`workflow.${safeSortBy}`, sortOrder);
      queryBuilder.addOrderBy('step.level', 'ASC');

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      const sanitizedData = data.map((workflow) =>
        this.mapWorkflowToPlain(workflow),
      );

      this.logger.log(
        `Retrieved ${sanitizedData.length} workflows (page ${page}, limit ${limit})`,
      );

      return {
        data: sanitizedData,
        total,
        page,
        limit,
      };
    } catch (err) {
      this.logger.error(
        `Failed to retrieve workflows: ${err.message}`,
        err.stack,
      );

      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const workflow = await this.workflowRepository
        .createQueryBuilder('workflow')
        .leftJoinAndSelect('workflow.steps', 'step')
        .leftJoinAndSelect('step.admin', 'admin')
        .leftJoinAndSelect('admin.roles', 'roles')
        .leftJoinAndSelect('admin.business_unit', 'business_unit')
        .leftJoinAndSelect('admin.office_branch', 'office_branch')
        .where('workflow.id = :id', { id })
        .andWhere('(step.id IS NULL OR step.adminId IS NOT NULL)')
        .orderBy('step.level', 'ASC')
        .getOne();

      if (!workflow) {
        throw new NotFoundException(
          `Approval Workflow with ID ${id} not found`,
        );
      }

      return this.mapWorkflowToPlain(workflow);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;

      this.logger.error(
        `Failed to retrieve workflow ID ${id}: ${err.message}`,
        err.stack,
      );
      throw new NotFoundException(
        `Approval Workflow with ID ${id} not found or data inconsistent`,
      );
    }
  }

  async update(
    id: number,
    updateWorkflowDto: UpdateApprovalWorkflowDto,
    currentUserId?: number,
  ): Promise<any> {
    const workflow = await this.workflowRepository.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Approval Workflow with ID ${id} not found`);
    }

    const { workflow_name, module, description, steps } = updateWorkflowDto;

    // Check for duplicate name if name is being updated (include soft-deleted — they hold the unique index)
    if (workflow_name && workflow_name !== workflow.workflow_name) {
      const existingWorkflow = await this.workflowRepository.findOne({
        where: { workflow_name },
        withDeleted: true,
      });

      if (existingWorkflow) {
        this.logger.warn(
          `Attempt to update workflow ${id} with duplicate name: ${workflow_name}`,
        );
        throw new ConflictException('A workflow with this name already exists');
      }
    }

    // Check for duplicate module if module is being updated (only among active workflows)
    if (module && module !== workflow.module) {
      const existingWorkflowByModule = await this.workflowRepository.findOne({
        where: { module, isActive: true },
      });

      if (existingWorkflowByModule) {
        this.logger.warn(
          `Attempt to update workflow ${id} with duplicate module: ${module}`,
        );
        throw new ConflictException(
          `A workflow already exists for the ${module} module`,
        );
      }
    }

    // Validate steps if provided
    if (steps) {
      const levels = steps.map((s) => s.level);
      if (new Set(levels).size !== levels.length) {
        this.logger.warn('Duplicate levels found in workflow steps');
        throw new BadRequestException(
          'Duplicate levels found in workflow steps',
        );
      }

      if (levels.some((level) => level < 1)) {
        this.logger.warn('Invalid level values detected');
        throw new BadRequestException(
          'All step levels must be positive numbers',
        );
      }
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. ARCHIVE the old workflow first to free up the unique name/module
      this.logger.log(`Archiving old version of workflow ${id}`);

      const archivedSuffix = ` (archived ${Date.now()})`;
      const originalName = workflow.workflow_name;
      const originalModule = workflow.module;

      workflow.workflow_name = originalName + archivedSuffix;
      workflow.module = originalModule ? originalModule + archivedSuffix : null;
      workflow.isActive = false;
      workflow.updatedBy = currentUserId;
      await queryRunner.manager.save(workflow);

      // 2. Create the NEW workflow version with original/updated details
      this.logger.log(`Creating new version for workflow ${id}`);

      const newWorkflow = this.workflowRepository.create({
        workflow_name: workflow_name || originalName,
        module: module || originalModule,
        description:
          description !== undefined ? description : workflow.description,
        createdBy: currentUserId,
        isActive: true,
      });

      const savedNewWorkflow = await queryRunner.manager.save(newWorkflow);

      // 3. Add steps to the new workflow
      const finalSteps =
        steps ||
        workflow.steps.map((s) => ({
          admin_id: s.adminId,
          level: s.level,
          enforce_branch_restriction: s.enforce_branch_restriction,
        }));

      // Validate all admins for new steps
      const adminIds = finalSteps.map((s) => s.admin_id);
      const admins = await queryRunner.manager
        .createQueryBuilder(Admin, 'admin')
        .where('admin.staffId IN (:...adminIds)', { adminIds })
        .andWhere('admin.account_status = :status', { status: 'ACTIVE' })
        .getMany();

      if (admins.length !== adminIds.length) {
        throw new BadRequestException(
          'One or more admins not found or inactive',
        );
      }

      const workflowSteps: ApprovalWorkflowStep[] = [];
      for (const stepDto of finalSteps) {
        const admin = admins.find((a) => a.staffId === stepDto.admin_id);
        const step = this.stepRepository.create({
          workflow: savedNewWorkflow,
          admin,
          level: stepDto.level,
          enforce_branch_restriction:
            stepDto.enforce_branch_restriction || false,
          createdBy: currentUserId,
        });
        workflowSteps.push(step);
      }
      await queryRunner.manager.save(workflowSteps);

      // 4. Migrate requests that HAVEN'T started approval (no history)
      // We search for requests linked to the old workflow ID that have no entries in flexi_approval_history
      this.logger.log(
        `Migrating eligible requests to new workflow ${savedNewWorkflow.id}`,
      );

      await queryRunner.query(
        `
        UPDATE flexi_requests r
        LEFT JOIN flexi_approval_history h ON r.id = h.request_id
        SET r.workflow_id = ? 
        WHERE r.workflow_id = ? 
        AND h.id IS NULL
      `,
        [savedNewWorkflow.id, id],
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `Successfully transitioned from workflow ${id} to ${savedNewWorkflow.id}`,
      );

      return await this.findOne(savedNewWorkflow.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to update workflow ${id}: ${err.message}`,
        err.stack,
      );

      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }

      throw new InternalServerErrorException(
        'Failed to update approval workflow',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number, currentUserId?: number): Promise<void> {
    try {
      const workflow = await this.workflowRepository.findOne({ where: { id } });
      if (!workflow) {
        throw new NotFoundException(
          `Approval Workflow with ID ${id} not found`,
        );
      }

      // Soft delete
      workflow.updatedBy = currentUserId;
      await this.workflowRepository.softRemove(workflow);

      this.logger.log(
        `Soft deleted workflow ${id} by user ${currentUserId || 'unknown'}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete workflow ${id}: ${err.message}`,
        err.stack,
      );

      if (err instanceof NotFoundException) {
        throw err;
      }

      throw new InternalServerErrorException(
        'Failed to delete approval workflow',
      );
    }
  }

  async runDatabaseCleanup(): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Starting legacy data cleanup...');
      await queryRunner.query(
        'DELETE FROM approval_workflow_step WHERE admin_id IS NULL',
      );
      await queryRunner.commitTransaction();
      return { success: true, message: 'Legacy data cleanup completed' };
    } catch (error) {
      this.logger.error('Cleanup failed', error.stack);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Cleanup failed');
    } finally {
      await queryRunner.release();
    }
  }

  private mapWorkflowToPlain(workflow: ApprovalWorkflow): any {
    if (!workflow) return null;

    return {
      id: workflow.id,
      workflow_name: workflow.workflow_name,
      module: workflow.module,
      description: workflow.description,
      isActive: workflow.isActive,
      createdBy: workflow.createdBy,
      updatedBy: workflow.updatedBy,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      steps: (workflow.steps || [])
        .filter((step) => step.adminId != null)
        .map((step) => this.mapStepToPlain(step))
        .sort((a, b) => a.level - b.level),
    };
  }

  private mapStepToPlain(step: ApprovalWorkflowStep): any {
    if (!step) return null;

    return {
      id: step.id,
      level: step.level,
      adminId: step.adminId,
      enforce_branch_restriction: step.enforce_branch_restriction || false,
      createdBy: step.createdBy,
      updatedBy: step.updatedBy,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
      admin: this.mapAdminToPlain(step.admin),
    };
  }

  private mapAdminToPlain(admin: Admin): any {
    if (!admin) return null;

    return {
      staffId: admin.staffId,
      staffFirstName: admin.staffFirstName,
      staffLastName: admin.staffLastName,
      staffEmail: admin.staffEmail,
      avatar: admin.avatar,
      user_type: admin.user_type,
      account_status: admin.account_status,
      roles: admin.roles
        ? {
            id: admin.roles.id,
            name: admin.roles.name,
          }
        : null,
      business_unit: admin.business_unit
        ? {
            id: admin.business_unit.id,
            name: admin.business_unit.business_unit_name,
          }
        : null,
      office_branch: admin.office_branch
        ? {
            id: admin.office_branch.id,
            name: admin.office_branch.branch_name,
          }
        : null,
    };
  }
}
