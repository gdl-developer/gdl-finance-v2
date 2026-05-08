import { Module } from '@nestjs/common';
import { OwnerDocsService } from './owner-docs.service';
import { OwnerDocsController } from './owner-docs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerDoc } from './entities/owner-doc.entity';
import { UserAccount } from '../user/entities/user.entity';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OwnerDoc, UserAccount]), // ✅ Register both entities
    AbilityModule,
    AccessValidatorModule,
  ],
  controllers: [OwnerDocsController],
  providers: [OwnerDocsService],
  exports: [OwnerDocsService],
})
export class OwnerDocsModule {}
