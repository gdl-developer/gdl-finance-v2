import {
  Injectable,
  NotAcceptableException,
  NotImplementedException,
} from '@nestjs/common';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessUnit } from './entities/business-unit.entity';
import { AbstractService } from 'src/common/abstract.service';

@Injectable()
export class BusinessUnitsService extends AbstractService {
  constructor(
    @InjectRepository(BusinessUnit)
    private readonly businessUnitRepo: Repository<BusinessUnit>,
  ) {
    super(businessUnitRepo);
  }
  async createBusinessUnit(createBusinessUnitDto: CreateBusinessUnitDto) {
    await this.validateExisting(createBusinessUnitDto);

    const business_unit = await this.create(createBusinessUnitDto);

    if (!business_unit) {
      throw new NotImplementedException('Business Unit creation failed');
    }

    return business_unit;
  }

  async validateExisting(createBusinessUnitDto: CreateBusinessUnitDto) {
    const { business_unit_name } = createBusinessUnitDto;
    const branch = await this.findOne({ business_unit_name });

    if (branch) {
      throw new NotAcceptableException(
        'Business Unit with this name already exist',
      );
    }
  }
}
