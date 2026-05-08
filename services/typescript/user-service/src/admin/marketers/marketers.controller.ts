import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { MarketersService } from './marketers.service';
import { CreateMarketerDto } from './dto/create-marketer.dto';
import { UpdateMarketerDto } from './dto/update-marketer.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { Marketer } from './entities/marketer.entity';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Marketers')
@Controller('admin/marketers')
export class MarketersController {
  constructor(private readonly marketersService: MarketersService) {}

  @Post()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: Marketer })
  @AuditLogger('CreateMarketer')
  async create(
    @Body() createMarketerDto: CreateMarketerDto,
    @Request() req: any,
  ) {
    const data = await this.marketersService.create(
      createMarketerDto,
      req?.user?.id,
    );
    return { data };
  }

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: Marketer })
  @AuditLogger('FindAllMarketers')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.marketersService.findAll(
      page ? +page : 1,
      limit ? +limit : 15,
      search,
    );
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: Marketer })
  @AuditLogger('FindOneMarketer')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.marketersService.findOne(id);
    return { data };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Marketer })
  @AuditLogger('UpdateMarketer')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMarketerDto: UpdateMarketerDto,
  ) {
    const data = await this.marketersService.update(id, updateMarketerDto);
    return { data };
  }

  @Patch(':id/toggle')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: Marketer })
  @AuditLogger('ToggleMarketerStatus')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    const data = await this.marketersService.toggleStatus(id);
    return { data };
  }

  @Delete(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Delete, subject: Marketer })
  @AuditLogger('DeleteMarketer')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.marketersService.remove(id);
    return { message: 'Marketer deleted successfully' };
  }
}
