import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'REPORTING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'reporting',
          protoPath: join(__dirname, '../../../../../proto/reporting.proto'),
          url: process.env.REPORTING_SERVICE_URL || 'localhost:50055',
        },
      },
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
