import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { Company_profile } from './entities/company.entity';
import { Director } from './entities/director.entity';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { CompanyDocument } from './entities/document.entity';
import { DocumentApproval } from './entities/document-approval.entity';
import { CompanyUserModule } from 'src/company-user/company-user.module'; // 👈 import module

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company_profile,
      Director,
      CompanyDocument,
      DocumentApproval,
    ]),
    AbilityModule,
    CompanyUserModule, // 👈 import instead of putting service in forFeature
  ],
  controllers: [CompanyController],
  providers: [CompanyService, AbilitiesGuard],
  exports: [CompanyService],
})
export class CompanyModule {}
