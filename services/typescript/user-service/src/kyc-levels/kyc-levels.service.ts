import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { Repository } from 'typeorm';
import { KycLevel } from './entities/kyc-level.entity';

@Injectable()
export class KycLevelsService extends AbstractService {
  constructor(
    @InjectRepository(KycLevel)
    private readonly kycLevelRepository: Repository<KycLevel>,
  ) {
    super(kycLevelRepository);
  }

  async getKycLevel(condition: any): Promise<KycLevel> {
    const kyc_level = await this.findOne(condition);
    if (!kyc_level) throw new NotFoundException('Kyc Level Not Found');

    return kyc_level;
  }
}
