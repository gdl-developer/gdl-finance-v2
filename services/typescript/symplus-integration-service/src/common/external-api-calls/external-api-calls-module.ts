import { Module } from "@nestjs/common";
import { ExternalApiCallsService } from "./external-api-calls.service";
import { AccessValidatorModule } from "../audit-logger/access-validator/access-validator.module";
import { SecurityModule } from "../security/security.module";

@Module({
  imports: [AccessValidatorModule, SecurityModule],
  providers: [ExternalApiCallsService],
  exports: [ExternalApiCallsService],
})
export class ExternalApiCallsModule {}
