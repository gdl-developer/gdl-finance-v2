import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { InfowebApiService } from "./infoweb-api.service";
import { InfowebApiController } from "./infoweb-api.controller";

import { LegacyApiController } from "./legacy-api.controller";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5,
      headers: {
        "User-Agent": "CBA-Symplus-Integration-Service/1.0.0",
      },
    }),
    ConfigModule, //For accessing environment variable
  ],
  controllers: [InfowebApiController, LegacyApiController],
  providers: [InfowebApiService],
  exports: [InfowebApiService],
})
export class InfowebApiModule {}
