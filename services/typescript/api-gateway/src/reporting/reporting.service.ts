import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface ReportingServiceClient {
  getDashboardStats(data: any): Observable<any>;
  getUserGrowth(data: any): Observable<any>;
}

@Injectable()
export class ReportingService implements OnModuleInit {
  private reportingService: ReportingServiceClient;

  constructor(@Inject('REPORTING_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.reportingService =
      this.client.getService<ReportingServiceClient>('ReportingService');
  }

  getDashboardStats(isSuperAdmin: boolean) {
    return this.reportingService.getDashboardStats({ isSuperAdmin });
  }

  getUserGrowth(days: number) {
    return this.reportingService.getUserGrowth({ days });
  }
}
