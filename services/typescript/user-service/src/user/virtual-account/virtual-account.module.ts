import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualAccountService } from './virtual-account.service';
import { VirtualAccountController } from './virtual-account.controller';
import { VirtualWalletService } from './virtual-wallet.service';
import { VirtualWalletController } from './virtual-wallet.controller';
import { SymplusService } from './symplus.service';
import { VirtualWallet } from './entities/virtual-wallet.entity';
import { VirtualWalletTransaction } from './entities/virtual-wallet-transaction.entity';
import { UserAccount } from '../user/entities/user.entity';
import { OwnerDocsModule } from '../owner-docs/owner-docs.module';
import { ExternalApiCallsModule } from '../../common/external-api-calls/external-api-calls-module';
import { EnvModule } from '../../common/env.module';
import { UserAccountModule } from '../user/user.module';
import { WalletsModule } from 'src/sidecars/wallets/wallets.module';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { InfowareModule } from '../infoware-request/infoware-request.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VirtualWallet,
      VirtualWalletTransaction,
      UserAccount,
    ]),
    OwnerDocsModule,
    ExternalApiCallsModule,
    EnvModule,
    UserAccountModule, // ✅ Ensure UserService is available
    WalletsModule, // ✅ Provides WalletsService with Wallet repository
    NubanAccountsModule, // ✅ Provides NubanAccountsService with NubanAccount repository
    forwardRef(() => InfowareModule),
  ],
  controllers: [VirtualAccountController, VirtualWalletController],
  providers: [VirtualAccountService, VirtualWalletService, SymplusService],
  exports: [VirtualAccountService, VirtualWalletService, SymplusService],
})
export class VirtualAccountModule {}
