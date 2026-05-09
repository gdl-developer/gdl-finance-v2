import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractService } from '../../common/abstract.service';
import { AccountSetting } from './entities/account-setting.entity';

@Injectable()
export class AccountSettingsService extends AbstractService {
  constructor(
    @InjectRepository(AccountSetting)
    private readonly accountRepository: Repository<AccountSetting>,
  ) {
    super(accountRepository);
  }
}
