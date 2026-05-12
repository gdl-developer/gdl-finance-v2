import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { getGrpcMetadata } from '../common/grpc-metadata.util';

interface TransactionServiceClient {
  transferInternal(data: any, metadata: any): Observable<any>;
  transferBank(data: any, metadata: any): Observable<any>;
  getTransactionHistory(data: any, metadata: any): Observable<any>;
  getBankList(data: any, metadata: any): Observable<any>;
  accountEnquiry(data: any, metadata: any): Observable<any>;
  transactionStatusQuery(data: any, metadata: any): Observable<any>;
}

@Injectable()
export class TransferService implements OnModuleInit {
  private transactionService: TransactionServiceClient;

  constructor(@Inject('TRANSACTION_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.transactionService =
      this.client.getService<TransactionServiceClient>('TransactionService');
  }

  transferInternal(data: any) {
    return this.transactionService.transferInternal(data, getGrpcMetadata());
  }

  transferBank(data: any) {
    return this.transactionService.transferBank(data, getGrpcMetadata());
  }

  getHistory(userId: string) {
    return this.transactionService.getTransactionHistory(
      { user_id: userId },
      getGrpcMetadata(),
    );
  }

  getBankList() {
    return this.transactionService.getBankList({}, getGrpcMetadata());
  }

  accountEnquiry(bankCode: string, accountNumber: string) {
    return this.transactionService.accountEnquiry(
      {
        bank_code: bankCode,
        account_number: accountNumber,
      },
      getGrpcMetadata(),
    );
  }

  transactionStatusQuery(reference: string, date: string, amount: number) {
    return this.transactionService.transactionStatusQuery(
      {
        reference,
        date,
        amount,
      },
      getGrpcMetadata(),
    );
  }
}
