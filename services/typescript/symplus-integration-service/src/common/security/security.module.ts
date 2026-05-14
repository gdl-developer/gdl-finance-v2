import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";
import { InternalAuthGuard } from "../guards/internal-auth.guard";
import { InternalSecurityService } from "../utils/internal-security.service";
import { SanitizingLoggerInterceptor } from "./interceptors/sanitizing-logger.interceptor";

@Module({
  imports: [ConfigModule],
  providers: [
    OptionalAuthGuard,
    InternalAuthGuard,
    InternalSecurityService,
    SanitizingLoggerInterceptor,
  ],
  exports: [
    OptionalAuthGuard,
    InternalAuthGuard,
    InternalSecurityService,
    SanitizingLoggerInterceptor,
  ],
})
export class SecurityModule {}
