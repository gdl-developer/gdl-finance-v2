import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { getGrpcMetadata } from '../common/grpc-metadata.util';

interface ReportingServiceClient {
  getDashboardStats(data: any, metadata: any): Observable<any>;
  getUserGrowth(data: any, metadata: any): Observable<any>;
}

@Injectable()
export class ReportingService implements OnModuleInit {
  private reportingService: ReportingServiceClient;

  constructor(@Inject('REPORTING_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.reportingService =
      this.client.getService<ReportingServiceClient>('ReportingService');
  }
  //This is a test report
  getDashboardStats(isSuperAdmin: boolean) {
    return this.reportingService.getDashboardStats(
      { isSuperAdmin },
      getGrpcMetadata(),
    );
  }

  getUserGrowth(days: number) {
    return this.reportingService.getUserGrowth({ days }, getGrpcMetadata());
  }
}
