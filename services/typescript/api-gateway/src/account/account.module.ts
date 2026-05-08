import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AccountController } from './account.controller';
import { VirtualAccountController } from './virtual-account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'ACCOUNT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'account',
          protoPath: join(__dirname, '../../../../../proto/account.proto'),
          url: process.env.ACCOUNT_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [AccountController, VirtualAccountController],
  providers: [AccountService],
})
export class AccountModule {}
