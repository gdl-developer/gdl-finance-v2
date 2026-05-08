import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OfficeBranchesService } from './office-branches.service';
import { CreateOfficeBranchDto } from './dto/create-office-branch.dto';
import { UpdateOfficeBranchDto } from './dto/update-office-branch.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { OfficeBranch } from './entities/office-branch.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Office Branches')
@Controller('office/branches')
export class OfficeBranchesController {
  constructor(private readonly officeBranchesService: OfficeBranchesService) {}

  @Post()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: OfficeBranch })
  @AuditLogger('CreateOfficeBranch')
  async create(@Body() createOfficeBranchDto: CreateOfficeBranchDto) {
    const branch = await this.officeBranchesService.createBranch(
      createOfficeBranchDto,
    );

    return { data: branch };
  }

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: OfficeBranch })
  @AuditLogger('FindAllOfficeBranches')
  async findAll() {
    const branch = await this.officeBranchesService.findAll();
    return { data: branch };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: OfficeBranch })
  @AuditLogger('FindOneOfficeBranch')
  async findOne(@Param('id') id: string) {
    const branch = await this.officeBranchesService.findOne(+id);
    return { data: branch };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: OfficeBranch })
  @AuditLogger('UpdateOfficeBranch')
  async update(
    @Param('id') id: string,
    @Body() updateOfficeBranchDto: UpdateOfficeBranchDto,
  ) {
    const branch = await this.officeBranchesService.update(+id, {
      ...updateOfficeBranchDto,
    });

    return { data: branch };
  }
}
