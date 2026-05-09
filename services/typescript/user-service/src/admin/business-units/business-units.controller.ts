import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { BusinessUnit } from './entities/business-unit.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Business Units')
@Controller('business/units')
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Post()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: BusinessUnit })
  @AuditLogger('CreateBusinessUnit')
  async create(@Body() createBusinessUnitDto: CreateBusinessUnitDto) {
    const unit = await this.businessUnitsService.createBusinessUnit(
      createBusinessUnitDto,
    );

    return { data: unit };
  }

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: BusinessUnit })
  @AuditLogger('FindAllBusinessUnit')
  async findAll() {
    const units = await this.businessUnitsService.findAll();

    return { data: units };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: BusinessUnit })
  @AuditLogger('FindOneBusinessUnit')
  async findOne(@Param('id') id: string) {
    const unit = await this.businessUnitsService.findOne({ id });

    return { data: unit };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: BusinessUnit })
  @AuditLogger('UpdateBusinessUnit')
  async update(
    @Param('id') id: string,
    @Body() updateBusinessUnitDto: UpdateBusinessUnitDto,
  ) {
    const unit = await this.businessUnitsService.update(+id, {
      ...updateBusinessUnitDto,
    });

    return { data: unit };
  }
}
