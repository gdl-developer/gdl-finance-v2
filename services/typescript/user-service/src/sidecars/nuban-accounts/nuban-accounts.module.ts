import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NubanAccount } from './entities/nuban-account.entity';
import { NubanAccountsService } from './nuban-accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([NubanAccount])],
  providers: [NubanAccountsService],
  exports: [NubanAccountsService, TypeOrmModule], // 👈 include TypeOrmModule here
})
export class NubanAccountsModule {}
