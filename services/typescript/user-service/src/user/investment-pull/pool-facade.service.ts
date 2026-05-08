import { Injectable } from '@nestjs/common';
import { InvestmentPoolCreateService } from './pool-create.service';
import { InvestmentPoolUpdateService } from './pool-update.service';
import { InvestmentPoolDeductionService } from './pool-deduction.service';

@Injectable()
export class InvestmentPoolFacadeService {
  constructor(
    private readonly createService: InvestmentPoolCreateService,
    private readonly updateService: InvestmentPoolUpdateService,
    private readonly deductionService: InvestmentPoolDeductionService,
  ) {}

  create = this.createService.create.bind(this.createService);
  update = this.updateService.update.bind(this.updateService);
  deduct = this.deductionService.deduct.bind(this.deductionService);
}
