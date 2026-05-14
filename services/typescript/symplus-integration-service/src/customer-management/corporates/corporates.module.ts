import { Module } from "@nestjs/common";
import { CorporatesService } from "./corporates.service";
import { CorporatesController } from "./corporates.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CorporateCustomer } from "./entities/corporate.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CorporateCustomer])],
  controllers: [CorporatesController],
  providers: [CorporatesService],
})
export class CorporatesModule {}
