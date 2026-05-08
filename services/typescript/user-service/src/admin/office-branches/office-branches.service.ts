import {
  Injectable,
  NotAcceptableException,
  NotImplementedException,
} from '@nestjs/common';
import { AbstractService } from 'src/common/abstract.service';
import { InjectRepository } from '@nestjs/typeorm';
import { OfficeBranch } from './entities/office-branch.entity';
import { Repository } from 'typeorm';
import { CreateOfficeBranchDto } from './dto/create-office-branch.dto';

@Injectable()
export class OfficeBranchesService extends AbstractService {
  constructor(
    @InjectRepository(OfficeBranch)
    private readonly officeBranchRepo: Repository<OfficeBranch>,
  ) {
    super(officeBranchRepo);
  }

  async createBranch(createOfficeBranchDto: CreateOfficeBranchDto) {
    await this.validateExisiting(createOfficeBranchDto);

    const branch_code = await this.genBranchCode(
      createOfficeBranchDto.branch_name,
    );

    console.log('branch_code', branch_code);

    const branch = await this.create({
      branch_code,
      ...createOfficeBranchDto,
    });

    if (!branch) {
      throw new NotImplementedException('Branch Creation Failed');
    }

    return branch;
  }

  async validateExisiting(createOfficeBranchDto: CreateOfficeBranchDto) {
    const { branch_name } = createOfficeBranchDto;
    const existing = await this.findOne({ branch_name });

    if (existing) {
      throw new NotAcceptableException('Branch Name Already Exist');
    }
  }

  async genBranchCode(branch_name: string) {
    const code = branch_name.slice(0, 6);

    return `GDL_${code.trim()}_${Math.floor(Math.random() * 10333 + 10019)}`;
  }
}
