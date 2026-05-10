import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface TransactionServiceClient {
  transferInternal(data: any): Observable<any>;
  transferBank(data: any): Observable<any>;
  getTransactionHistory(data: any): Observable<any>;
  getBankList(data: any): Observable<any>;
  accountEnquiry(data: any): Observable<any>;
  transactionStatusQuery(data: any): Observable<any>;
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
    return this.transactionService.transferInternal(data);
  }

  transferBank(data: any) {
    return this.transactionService.transferBank(data);
  }

  getHistory(userId: string) {
    return this.transactionService.getTransactionHistory({ user_id: userId });
  }

  getBankList() {
    return this.transactionService.getBankList({});
  }

  accountEnquiry(bankCode: string, accountNumber: string) {
    return this.transactionService.accountEnquiry({
      bank_code: bankCode,
      account_number: accountNumber,
    });
  }

  transactionStatusQuery(reference: string, date: string, amount: number) {
    return this.transactionService.transactionStatusQuery({
      reference,
      date,
      amount,
    });
  }
}
