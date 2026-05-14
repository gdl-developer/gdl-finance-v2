import { Module } from "@nestjs/common";
import { SymplusApiRequestsService } from "./symplus-api-requests.service";
import { SymplusApiRequestsController } from "./symplus-api-requests.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SymplusApiRequest } from "./entities/symplus-api-request.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SymplusApiRequest])],
  controllers: [SymplusApiRequestsController],
  providers: [SymplusApiRequestsService],
  exports: [SymplusApiRequestsService],
})
export class SymplusApiRequestsModule {}
