import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { KycLevelsService } from './kyc-levels.service';
import { UpdateKycLevelDto } from './dto/update-kyc-level.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { KycLevel } from './entities/kyc-level.entity';

@ApiTags('Kyc Levels')
@Controller('kyc')
export class KycLevelsController {
  constructor(private readonly kycLevelsService: KycLevelsService) {}

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: KycLevel })
  @AuditLogger('GetKYCLevels')
  async findAll() {
    const kyc_levels = await this.kycLevelsService.findAll();
    return { success: true, data: kyc_levels };
  }

  @Get(':id')
  @AuditLogger('GetKYCLevel')
  async findOne(@Param('id') id: string) {
    const kyc_level = await this.kycLevelsService.findOne(+id);

    if (!kyc_level)
      throw new NotFoundException('Kyc Level With This Id Not  Found');

    return { success: true, data: kyc_level };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Update, subject: KycLevel })
  @AuditLogger('UpdateKYCLevel')
  async update(
    @Param('id') id: string,
    @Body() updateKycLevelDto: UpdateKycLevelDto,
  ) {
    const kyc_level = await this.kycLevelsService.update(+id, {
      ...updateKycLevelDto,
    });

    return { success: true, data: kyc_level };
  }
}
