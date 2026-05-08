import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { Repository } from 'typeorm';
import { AccountStatus, Wallet } from './entities/wallet.entity';
import { BvnStatusCheckDto } from './dto/bvn-status-check.dto';

@Injectable()
export class WalletsService extends AbstractService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {
    super(walletRepository);
  }

  async validateBVNStatus(bvnStatusCheck: BvnStatusCheckDto) {
    const { user_id, wallet_ref } = bvnStatusCheck;
    const wallet = await this.walletRepository.findOne({
      user_id,
      wallet_ref,
    });
    console.log('wallet', wallet);
    if (!wallet) throw new NotFoundException('User Wallet Not Found');

    if (wallet.wallet_status == AccountStatus.BLOCKED) {
      throw new NotAcceptableException(
        'Account Is Blocked. Action Cannot Be Completed',
      );
    }

    if (wallet.bvn == '' || wallet.bvn == null || wallet.bvn == undefined) {
      return false;
    } else {
      return true;
    }
  }

  async fetchWallet(bvnStatusCheck: BvnStatusCheckDto) {
    const { user_id, wallet_ref } = bvnStatusCheck;
    const wallet = await this.walletRepository.findOne({
      user_id,
      wallet_ref,
    });

    return wallet;
  }
}
