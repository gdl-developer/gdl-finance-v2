import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface AccountServiceClient {
  getBankOneBalance(data: any): Observable<any>;
  getUBABalance(data: any): Observable<any>;
  getRMBBalance(data: any): Observable<any>;
  getVirtualAccounts(data: any): Observable<any>;
  createVirtualAccount(data: any): Observable<any>;
  getTransactions(data: any): Observable<any>;
}

@Injectable()
export class AccountService implements OnModuleInit {
  private accountService: AccountServiceClient;

  constructor(@Inject('ACCOUNT_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.accountService =
      this.client.getService<AccountServiceClient>('AccountService');
  }

  getBankOneBalance(userId: string) {
    return this.accountService.getBankOneBalance({ userId });
  }

  getUBABalance(userId: string) {
    return this.accountService.getUBABalance({ userId });
  }

  getRMBBalance(userId: string) {
    return this.accountService.getRMBBalance({ userId });
  }

  getVirtualAccounts(userId: string) {
    return this.accountService.getVirtualAccounts({ userId });
  }

  createVirtualAccount(userId: string, bvn: string) {
    return this.accountService.createVirtualAccount({ userId, bvn });
  }

  getTransactions(userId: string) {
    return this.accountService.getTransactions({ userId });
  }
}
