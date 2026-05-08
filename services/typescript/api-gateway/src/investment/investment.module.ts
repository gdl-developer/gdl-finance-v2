import { AuthModule } from "../auth/auth.module";
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'SYMPLUS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'symplus',
          protoPath: join(__dirname, '../../../../../proto/symplus.proto'),
          url: process.env.SYMPLUS_CONNECTOR_URL || 'localhost:50058',
        },
      },
    ]),
  ],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
