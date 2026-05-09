import { Module } from '@nestjs/common';
import { CbaInteractionsService } from './cba-interactions.service';
import { CbaInteractionsController } from './cba-interactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CbaInteraction } from './entities/cba-interaction.entity';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { WalletsModule } from 'src/sidecars/wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CbaInteraction]),
    ExternalApiCallsModule,
    NubanAccountsModule,
    WalletsModule,
  ],
  controllers: [CbaInteractionsController],
  providers: [CbaInteractionsService],
  exports: [CbaInteractionsService],
})
export class CbaInteractionsModule {}
