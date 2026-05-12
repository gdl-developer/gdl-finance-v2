import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { getGrpcMetadata } from '../common/grpc-metadata.util';

interface AccountServiceClient {
  createVirtualAccount(data: any, metadata: any): Observable<any>;
  getTransactions(data: any, metadata: any): Observable<any>;
  getBankOneBalance(data: any, metadata: any): Observable<any>;
  getUBABalance(data: any, metadata: any): Observable<any>;
  getRMBBalance(data: any, metadata: any): Observable<any>;
  getVirtualAccounts(data: any, metadata: any): Observable<any>;
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
    return this.accountService.getBankOneBalance({ userId }, getGrpcMetadata());
  }

  getUBABalance(userId: string) {
    return this.accountService.getUBABalance({ userId }, getGrpcMetadata());
  }

  getRMBBalance(userId: string) {
    return this.accountService.getRMBBalance({ userId }, getGrpcMetadata());
  }

  getVirtualAccounts(userId: string) {
    return this.accountService.getVirtualAccounts(
      { userId },
      getGrpcMetadata(),
    );
  }

  createVirtualAccount(userId: string, bvn: string) {
    return this.accountService.createVirtualAccount(
      { userId, bvn },
      getGrpcMetadata(),
    );
  }

  getTransactions(userId: string) {
    return this.accountService.getTransactions({ userId }, getGrpcMetadata());
  }
}
