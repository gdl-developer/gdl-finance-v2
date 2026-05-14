import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  NotAcceptableException,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ConfigService } from "@nestjs/config";
import { encrypt, decrypt } from "../utils/crypto-hash-helper";

@Injectable()
export class RequestInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = new Logger(RequestInterceptor.name);
  private readonly sysAuth: string;
  private readonly eky: string;

  constructor(private readonly configService: ConfigService) {
    this.sysAuth = this.configService.get<string>("SYS_AUTH") ?? "";
    this.eky = this.configService.get<string>("EKY") ?? "";
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const bearerauth = request.headers["bearerauth"];

    if (!bearerauth) {
      this.logger.warn("Unauthorized Request - Missing bearerauth header");
      throw new NotAcceptableException("Unauthorized Request");
    }

    try {
      const decrypted = await this.decryptKeys(bearerauth);

      if (decrypted !== this.sysAuth) {
        this.logger.warn("Unauthorized Request - Invalid authentication token");
        throw new NotAcceptableException("Unauthorized Request");
      }

      return next.handle();
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      throw new NotAcceptableException("Unauthorized Request");
    }
  }

  private async decryptKeys(token: any): Promise<string> {
    return decrypt(token, this.eky);
  }

  // Utility method for testing/debugging - not used in production
  async encryptKeys(): Promise<string> {
    return encrypt(this.sysAuth, this.eky);
  }
}
