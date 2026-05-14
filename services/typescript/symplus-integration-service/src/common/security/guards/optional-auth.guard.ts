import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decrypt } from "../../utils/crypto-hash-helper";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalAuthGuard.name);
  private readonly enforceAuth: boolean;
  private readonly sysAuth: string;
  private readonly eky: string;

  constructor(private readonly configService: ConfigService) {
    this.enforceAuth =
      this.configService.get<string>("ENFORCE_AUTH") === "true";
    this.sysAuth = this.configService.get<string>("SYS_AUTH") ?? "";
    this.eky = this.configService.get<string>("EKY") ?? "";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const bearerauth = request.headers["bearerauth"];

    // If no auth header provided
    if (!bearerauth) {
      if (this.enforceAuth) {
        this.logger.warn(
          `Unauthorized request to ${request.url} - Authentication required but not provided`
        );
        return false;
      } else {
        this.logger.warn(
          `Unauthenticated request to ${request.url} from ${request.ip} - Authentication recommended`
        );
        return true; // Allow for backward compatibility
      }
    }

    // Validate the auth header
    try {
      this.logger.debug(
        `Attempting decryption for token starting with: ${bearerauth
          .toString()
          .substring(0, 10)}...`
      );
      const decrypted = await this.decryptToken(bearerauth);

      if (decrypted !== this.sysAuth) {
        this.logger.warn(
          `Invalid authentication token for ${request.url} from ${
            request.ip
          }. Decrypted length: ${decrypted?.length || 0}`
        );
        return false;
      }

      // Valid authentication
      this.logger.debug(`Authenticated request to ${request.url}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Authentication error for ${request.url}: ${
          error.message
        }. Token prefix: ${bearerauth.toString().substring(0, 10)}`
      );
      throw new UnauthorizedException(
        "Authentication failed: Invalid credentials format"
      );
    }
  }

  private async decryptToken(token: string): Promise<string> {
    return decrypt(token, this.eky);
  }
}
