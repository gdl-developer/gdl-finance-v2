import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FixedDepositService } from './fixed-deposit.service';
import { CreateFixedDepositDto } from './dto/create-fixed-deposit.dto';
import { TopUpFixedDepositDto } from './dto/top-up-fixed-deposit.dto';
import { GetFixedDepositAccountByLiquidationAccountDto } from './dto/get-fixed-deposit-by-liquidation-account.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';

@ApiTags('Fixed Deposits')
@ApiBearerAuth()
@Controller('fixed/deposit')
export class FixedDepositsController {
  constructor(private readonly fixedDepositService: FixedDepositService) {}

  @Get('get/by/phone/number')
  @ApiOperation({
    summary:
      "Retrieves fixed deposit account details using the authenticated user's phone number.",
  })
  @AuditLogger('GetFixedDepositByPhoneNumber')
  async GetFixedDepositByPhoneNumber(@Request() req: any) {
    const phone = req.whoAmmI?.phone;
    return this.fixedDepositService.getFixedDepositByPhoneNumber(phone);
  }

  @Get('/')
  @ApiOperation({ summary: 'Retrieves all fixed deposit records.' })
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: 'FixedDeposit' })
  @AuditLogger('GetAllFixedDeposit')
  async findAll() {
    return this.fixedDepositService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieves a single fixed deposit record by its database ID.',
  })
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: 'FixedDeposit' })
  @AuditLogger('GetOneFixedDeposit')
  async findOne(@Param('id') id: string) {
    return this.fixedDepositService.findOne(id);
  }

  @Post('create')
  @ApiOperation({
    summary: 'Creates a new fixed deposit account via BankOne API.',
  })
  @AuditLogger('createFixedDeposit')
  async createFixedDeposit(
    @Body() createFixedDepositDto: CreateFixedDepositDto,
  ) {
    return this.fixedDepositService.createFixedDeposit(createFixedDepositDto);
  }

  @Get('get/by/liquidation/account')
  @ApiOperation({
    summary:
      'Retrieves fixed deposit account details using the liquidation account number.',
  })
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: 'FixedDeposit' })
  @AuditLogger('getFixedDepositByLiquidationAccount')
  async getFixedDepositByLiquidationAccount(
    @Query() query: GetFixedDepositAccountByLiquidationAccountDto,
  ) {
    return this.fixedDepositService.getFixedDepositByLiquidationAccount(query);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Adds funds to an existing fixed deposit account.' })
  @AuditLogger('topUpFixedDeposit')
  async topUpFixedDeposit(@Body() topUpFixedDepositDto: TopUpFixedDepositDto) {
    return this.fixedDepositService.topUpFixedDeposit(topUpFixedDepositDto);
  }
}
