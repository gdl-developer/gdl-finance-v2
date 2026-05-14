import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common/interfaces";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { getClientIp } from "request-ip";
import { AUDIT_LOG_DATA } from "./audit-log.decorator";
import { AuditLogger } from "../entities/audit-logger.entity";
import { AccessValidator } from "../access-validator/access-validator.service";
import { encrypt } from "src/common/utils/crypto-hash-helper";
// load all env values
import * as dotenv from "dotenv";
dotenv.config();

const LOG_EKY = process.env.LOG_EKY;

export interface Request<T> {
  data: T;
}

@Injectable()
export class AuditLoggerInterceptor<T>
  implements NestInterceptor<T, Request<T>>
{
  logger = new Logger(AuditLoggerInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  @Inject()
  private readonly validatorService: AccessValidator;

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>
  ): Promise<Observable<Request<T>>> {
    const action_performed = this.reflector.get<string>(
      AUDIT_LOG_DATA,
      context.getHandler()
    );

    const request = context.switchToHttp().getRequest();

    if (request.originalUrl.match("s/seeds/")) {
      return next.handle();
    }

    const ip = getClientIp(request);

    const headers_array = request.rawHeaders;
    const refresh_token = await this.validatorService.validateHeaders(
      headers_array
    );

    // validate token to get the user/admin id and role
    let userData: any = null;
    try {
      userData = await this.validatorService.getUserWithRefreshToken(
        refresh_token
      );
    } catch (err) {
      this.logger.warn(
        `AuditLogger: Token validation failed, proceeding as Guest: ${err.message}`
      );
    }

    const user_id = userData?.user_id || null;
    const user_name = userData?.user_name || "Guest";
    const user_type = userData?.user_type || "ADMIN";
    const roles = userData?.roles || "";

    return next.handle().pipe(
      tap(async (res: any) => {
        if (!action_performed) {
          return;
        }

        const data: QueryDeepPartialEntity<AuditLogger> = {
          user_id,
          user_type,
          user_name,
          roles,
          action_performed,
          ip_address: ip,
          tenant_code: request.body.tenant_code,
          attributes: await encrypt(
            JSON.stringify({
              body: request.body,
              params: request.params,
              res,
            }),
            LOG_EKY
          ),
        };

        try {
          await this.validatorService.insertLog(data);
          console.log("Audit Log Saved Successfully");
        } catch (err) {
          this.logger.error("Unable to save audit log", err);
          // throw err;
        }
      })
    );
  }
}
