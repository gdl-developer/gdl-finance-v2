import { Module } from "@nestjs/common";
import { CustomerManagementService } from "./customer-management.service";
import { CustomerManagementController } from "./customer-management.controller";
import { CorporatesModule } from "./corporates/corporates.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerManagement } from "./entities/customer-management.entity";
import { SymplusApiRequestsModule } from "src/symplus-api-requests/symplus-api-requests.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerManagement]),
    CorporatesModule,
    SymplusApiRequestsModule,
  ],
  controllers: [CustomerManagementController],
  providers: [CustomerManagementService],
})
export class CustomerManagementModule {}
