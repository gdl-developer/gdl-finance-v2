import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractService } from 'src/common/abstract.service';
import { paginatedResult } from 'src/common/paginated-result.interface';
import { Repository } from 'typeorm';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { LoginHistory } from './entities/login-history.entity';

@Injectable()
export class LoginHistoryService extends AbstractService {
  constructor(
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepo: Repository<LoginHistory>,
  ) {
    super(loginHistoryRepo);
  }

  async createUserLoginHistory(createLoginHistoryDto: CreateLoginHistoryDto) {
    console.log('createLoginHistoryDto', createLoginHistoryDto);
    const history = await this.create({
      ...createLoginHistoryDto,
    });

    if (!history) console.log('Login History creation failed');
    return history;
  }

  async userLoginHistory(
    page = 1,
    per_page = 15,
    user_id: any,
    query: any,
  ): Promise<paginatedResult> {
    const his = await this.paginate(page, per_page, {
      user_id: user_id,
      ...query,
    });

    return his;
  }
}
