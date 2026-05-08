import { Injectable, NotImplementedException } from '@nestjs/common';
import { AbstractService } from 'src/common/abstract.service';
import { InjectRepository } from '@nestjs/typeorm';
import { NubanAccount } from './entities/nuban-account.entity';
import { Repository } from 'typeorm';
import { CreateNubanAccountDto } from './dto/create-nuban-account.dto';

@Injectable()
export class NubanAccountsService extends AbstractService {
  constructor(
    @InjectRepository(NubanAccount)
    private readonly nubanAccountRepo: Repository<NubanAccount>,
  ) {
    super(nubanAccountRepo);
  }

  async storeUserNuban(createNubanAccountDto: CreateNubanAccountDto) {
    await this.validateExisting(createNubanAccountDto);
    const account = await this.create(createNubanAccountDto);
    console.log('account', account);
    if (!account) {
      throw new NotImplementedException('Failed Storing User Nuban Account');
    }
    return account;
  }

  async validateExisting(createNubanAccountDto: CreateNubanAccountDto) {
    const exisitng = await this.findOne({
      user_id: createNubanAccountDto.user_id,
    });

    if (exisitng) {
      console.log('User Nuban Account Already Exist');
    }
  }

  async fetchUserNubanDetails(user_id: number) {
    const nuban_details = await this.findOne({
      user_id,
    });

    if (!nuban_details) {
      return false;
    } else {
      return true;
    }
  }

  async fetchUserNubanWitheDetails(user_id: number) {
    const nuban_details = await this.findOne({
      user_id,
    });

    return nuban_details;
  }

  async fetchUserNuban(user_id: number, user_account_ref: string) {
    let user_nuban = null;
    const nuban = await this.findOne({ user_id, user_account_ref });
    if (nuban) {
      user_nuban = nuban;
    }
    return user_nuban;
  }
}
