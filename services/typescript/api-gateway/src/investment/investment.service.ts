import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface SymplusServiceClient {
  getFunds(data: any): Observable<any>;
  getFundAccounts(data: any): Observable<any>;
  fundSubscription(data: any): Observable<any>;
  fundRedemption(data: any): Observable<any>;
  getFundPrice(data: any): Observable<any>;
}

@Injectable()
export class InvestmentService implements OnModuleInit {
  private symplusService: SymplusServiceClient;

  constructor(@Inject('SYMPLUS_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.symplusService =
      this.client.getService<SymplusServiceClient>('SymplusService');
  }

  getMutualFunds() {
    return this.symplusService.getFunds({});
  }

  getCustomerInvestments(customerId: string) {
    return this.symplusService.getFundAccounts({ customer_id: customerId });
  }

  subscribe(data: any) {
    return this.symplusService.fundSubscription(data);
  }

  redeem(data: any) {
    return this.symplusService.fundRedemption(data);
  }

  getPrice(fundId: string) {
    return this.symplusService.getFundPrice({ fund_id: fundId });
  }
}
