import { AuthModule } from "../auth/auth.module";
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'TRANSACTION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'transaction',
          protoPath: join(__dirname, '../../../../../proto/transaction.proto'),
          url: process.env.TRANSACTION_SERVICE_URL || 'localhost:50057',
        },
      },
    ]),
  ],
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}
