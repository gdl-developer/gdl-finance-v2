import { Controller } from '@nestjs/common';
import { CbaInteractionsService } from './cba-interactions.service';
import { ApiTags } from '@nestjs/swagger';
// import { UpdateBankOneCustomerDto } from './dto/update-bankone-customer.dto';

@ApiTags('CBA Interactions')
@Controller('cba/interactions')
export class CbaInteractionsController {
  constructor(
    private readonly cbaInteractionsService: CbaInteractionsService,
  ) {}

  // @Post('update/bo/customer')
  // async create(@Body() updateBankOneCustomerDto: UpdateBankOneCustomerDto) {
  //   const customer = await this.cbaInteractionsService.updateBankOneCustomer(
  //     updateBankOneCustomerDto,
  //   );

  //   return customer;
  // }

  // @Get()
  // findAll() {
  //   return this.cbaInteractionsService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.cbaInteractionsService.findOne(+id);
  // }
}
