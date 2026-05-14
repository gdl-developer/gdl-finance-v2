import { Injectable, Logger, NotAcceptableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditLoggerService } from "../audit-logger.service";
import { UserType } from "../entities/audit-logger.entity";
import * as dotenv from "dotenv";
import { decrypt } from "src/common/utils/crypto-hash-helper";
dotenv.config();

const REFRESH_AUTH = process.env.REFRESH_AUTH;
const SYS_AUTH = process.env.SYS_AUTH;
const EKY = process.env.EKY;

@Injectable()
export class AccessValidator {
  logger = new Logger(AccessValidator.name);

  constructor(
    private jwtService: JwtService,
    private readonly auditLoggerService: AuditLoggerService
  ) {}

  async validateRefreshToken(token: string): Promise<any> {
    try {
      const verify_res = await this.jwtService.verifyAsync(token, {
        secret: REFRESH_AUTH,
      });

      return verify_res;
    } catch (error) {
      this.logger.error("Unvalidated User Request", error);
      throw new NotAcceptableException("Unvalidated User Request");
    }
  }

  async getUserWithRefreshToken(refresh_token: string) {
    // 1. Check if it is a system-to-system token
    try {
      const decrypted = await decrypt(refresh_token, EKY);
      if (decrypted === SYS_AUTH) {
        return {
          user_id: "SYSTEM",
          user_name: "System Service",
          user_type: "SYSTEM",
          roles: "ADMIN",
          client_ip: "127.0.0.1",
          phone: "",
        };
      }
    } catch (e) {
      // Not a system token, proceed to JWT validation
    }

    const { user_id, user_type, user_name, roles } =
      await this.validateRefreshToken(refresh_token);

    if (!roles || !user_type) {
      throw new NotAcceptableException("Unvalidated User Request");
    }

    return {
      user_id,
      user_type,
      user_name,
      roles,
    };
  }

  async insertLog(data: any) {
    console.log("insertLog data", data);
    return await this.auditLoggerService.insert(data);
  }

  async signServiceRefreshToken(): Promise<any> {
    const payload = {
      user_id: null,
      user_type: UserType.MICRO_SERVICE,
      user_name: "User Service",
      roles: UserType.MICRO_SERVICE,
    };
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: "1h",
      secret: REFRESH_AUTH,
    });

    return refresh_token;
  }

  async validateHeaders(headers_array: any) {
    let refresh_token: string;

    let i = 0;
    for (const token of headers_array) {
      if (token.toLowerCase() == "bearerauth") {
        refresh_token = headers_array[i + 1];
        break;
      }
      i++;
    }

    if (!refresh_token) {
      throw new NotAcceptableException("Unauthorized Request");
    }

    return refresh_token;
  }
}
