import { Injectable } from "@nestjs/common";
import { AbstractService } from "src/common/abstracts/abstract.service";
import { InjectRepository } from "@nestjs/typeorm";
import { CorporateCustomer } from "./entities/corporate.entity";
import { Repository } from "typeorm";

@Injectable()
export class CorporatesService extends AbstractService {
  constructor(
    @InjectRepository(CorporateCustomer)
    private readonly corporateCustomerRepo: Repository<CorporateCustomer>
  ) {
    super(corporateCustomerRepo);
  }
}
