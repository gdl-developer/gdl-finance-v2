import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessValidator } from "./access-validator.service";
import { AuditLoggerModule } from "../audit-logger.module";
import { jwtConstants } from "../constants/constants";

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: "60s" },
    }),
    AuditLoggerModule,
  ],
  controllers: [],
  providers: [AccessValidator],
  exports: [JwtModule, AccessValidator],
})
export class AccessValidatorModule {}
