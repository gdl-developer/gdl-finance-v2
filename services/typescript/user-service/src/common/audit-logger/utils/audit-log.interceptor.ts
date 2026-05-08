import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common/interfaces';
import { Observable, from, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { getClientIp } from 'request-ip';
import { UAParser } from 'ua-parser-js';
import { AUDIT_LOG_DATA } from './audit-log.decorator';
import { AuditLogger } from '../entities/audit-logger.entity';
import { AccessValidator } from '../access-validator/access-validator.service';
import { ConfigService } from '@nestjs/config';
import { encrypt } from 'src/common/utils/crypto-hash-helper';

@Injectable()
export class AuditLoggerInterceptor<T> implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggerInterceptor.name);

  private requestsMap = new Map<
    string,
    { count: number; timer: NodeJS.Timeout; userAgent: string }
  >();

  private readonly MAX_REQUESTS: number;
  private readonly TIME_WINDOW: number;
  private readonly LOG_EKY: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(AccessValidator)
    private readonly validatorService: AccessValidator,
  ) {
    this.MAX_REQUESTS = Number(
      this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 200),
    );
    this.TIME_WINDOW = Number(
      this.configService.get<number>(
        'RATE_LIMIT_TIME_WINDOW_MS',
        30 * 60 * 1000,
      ),
    );
    this.LOG_EKY = this.configService.get<string>('LOG_EKY') || '';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action_performed = this.reflector.get<string>(
      AUDIT_LOG_DATA,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();

    // Skip audit logging for certain routes (excluding login now)
    const isLoginRoute =
      request.originalUrl.includes('/login') ||
      request.originalUrl.includes('/validate/user');
    const isAuthRoute =
      request.originalUrl.includes('/admin/auth/') ||
      request.originalUrl.includes('/auth/');

    if (
      (!action_performed && isAuthRoute) ||
      request.originalUrl.match('/validate/phone/exist/') ||
      request.originalUrl.match('/virtual-account/callback') ||
      request.originalUrl.includes('/flexi/')
    ) {
      return next.handle();
    }

    const ip = getClientIp(request);
    const userAgentRaw = request.headers['user-agent'] || 'unknown';
    const frontendMetadataRaw = request.headers['x-audit-metadata'] as string;

    let frontendMetadata: any = null;
    if (frontendMetadataRaw) {
      try {
        frontendMetadata = JSON.parse(
          Buffer.from(frontendMetadataRaw, 'base64').toString(),
        );
      } catch (err) {
        this.logger.error('Failed to parse frontend metadata header', err);
      }
    }

    // Parse User-Agent
    const parser = new UAParser(userAgentRaw);
    const uaResult = parser.getResult();
    const browser =
      `${uaResult.browser.name || ''} ${uaResult.browser.version || ''}`.trim() ||
      'Unknown Browser';
    const os =
      `${uaResult.os.name || ''} ${uaResult.os.version || ''}`.trim() ||
      'Unknown OS';
    const device =
      `${uaResult.device.vendor || ''} ${uaResult.device.model || ''} ${uaResult.device.type || ''}`.trim() ||
      'Desktop';

    // Refactor to standard RxJS flow
    return from(this.validatorService.validateHeaders(request.headers)).pipe(
      catchError(() => of(null)), // Ignore header errors for now to allow login flow
      switchMap((refresh_token) => {
        if (!refresh_token) return of(null);
        return from(
          this.validatorService.getUserWithRefreshToken(refresh_token),
        ).pipe(catchError(() => of(null)));
      }),
      switchMap((userData) => {
        const user_id = userData?.user_id || null;
        const user_name = userData?.user_name || 'Guest';
        const user_type = userData?.user_type || 'ADMIN';
        const roles = userData?.roles || '';
        const client_ip = userData?.client_ip || ip;

        const rateLimitIdentifier = user_id
          ? `${client_ip}-${user_id}-${userAgentRaw}`
          : `${ip}-${userAgentRaw}`;

        if (this.isRateLimited(rateLimitIdentifier, userAgentRaw)) {
          throw new HttpException(
            'Too Many Requests',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        request.whoAmmI = {
          user_id,
          user_name,
          user_type,
          roles,
          client_ip,
          userAgent: userAgentRaw,
          deviceInfo: { browser, os, device },
          frontendMetadata,
        };

        return next.handle().pipe(
          tap(async (res) => {
            if (!action_performed || request.method === 'GET') return;

            // Extract user info from response for login actions
            let finalUserId = user_id;
            let finalUserName = user_name;
            let finalUserType = user_type;
            let finalRoles = Array.isArray(roles)
              ? roles.join(', ')
              : String(roles || '');

            if (
              action_performed === 'AdminLogin' &&
              res?.success &&
              res?.data
            ) {
              const profile = res.data.user || res.data;
              finalUserId = profile.staffId || profile.id;
              finalUserName = (
                `${profile.staffFirstName || ''} ${profile.staffLastName || ''}`.trim() ||
                profile.staffEmail ||
                profile.email ||
                profile.userName ||
                'Admin'
              ).trim();
              finalUserType = profile.user_type || 'ADMIN';
              if (profile.roles) {
                finalRoles =
                  profile.roles.roleName ||
                  (Array.isArray(profile.roles)
                    ? profile.roles.map((r) => r.roleName).join(', ')
                    : String(profile.roles));
              }
            }

            const finalOS = frontendMetadata?.os || os;
            const finalDeviceInfo = {
              browser,
              os: finalOS,
              device,
              ...(frontendMetadata?.screen
                ? { screen: frontendMetadata.screen }
                : {}),
              ...(frontendMetadata?.network
                ? { network: frontendMetadata.network }
                : {}),
              ...(frontendMetadata?.timezone
                ? { timezone: frontendMetadata.timezone }
                : {}),
              languages: frontendMetadata?.languages,
            };

            const pathInfo =
              request.body?.pageName ||
              frontendMetadata?.currentPath ||
              request.route?.path ||
              request.originalUrl.split('?')[0];
            let finalActionPerformed = action_performed;

            if (action_performed === 'AdminNavigation') {
              const pageName =
                request.body?.pageName || request.body?.path || pathInfo;
              finalActionPerformed = `Visited ${pageName}`;
            } else if (
              pathInfo &&
              !['AdminLogin', 'AdminLogout'].includes(action_performed)
            ) {
              finalActionPerformed = `${action_performed} on ${pathInfo}`;
            }

            const data: QueryDeepPartialEntity<AuditLogger> = {
              user_id: finalUserId,
              user_type: finalUserType as any,
              user_name: finalUserName,
              roles: finalRoles,
              action_performed: finalActionPerformed,
              ip_address: `request_ip: ${ip} | session_ip: ${client_ip} | Browser: ${browser} | OS: ${finalOS}`,
              attributes: await encrypt(
                await this.safeStringifyResponse(
                  request,
                  res,
                  finalDeviceInfo,
                  frontendMetadata,
                ),
                this.LOG_EKY,
              ),
            };

            try {
              await this.validatorService.insertLog(data);
            } catch (err) {
              this.logger.error('Unable to save audit log', err);
            }
          }),
        );
      }),
    );
  }

  private async safeStringifyResponse(
    request: any,
    res: any,
    deviceInfo?: any,
    frontendMetadata?: any,
  ): Promise<string> {
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        // Mask nested sensitive fields in deep objects if needed
        if (
          ['password', 'oldPassword', 'newPassword', 'pin', 'token'].includes(
            key,
          )
        ) {
          return '********';
        }
        return value;
      };
    };

    try {
      return JSON.stringify(
        {
          method: request.method,
          url: request.originalUrl,
          path: request.route?.path || request.originalUrl.split('?')[0],
          query: request.query,
          params: request.params,
          body: this.sanitizeBody(request.body),
          deviceInfo,
          frontendMetadata,
          res: this.sanitizeResponse(res),
        },
        getCircularReplacer(),
      );
    } catch (err) {
      this.logger.error(
        `Response serialization failed in AuditLogger: ${err.message}`,
      );
      return JSON.stringify({
        method: request.method,
        url: request.originalUrl,
        body: '[Serialization Error]',
        res: '[Serialization Error]',
      });
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    const fieldsToMask = [
      'password',
      'oldPassword',
      'newPassword',
      'pin',
      'token',
    ];
    fieldsToMask.forEach((field) => {
      if (sanitized[field]) sanitized[field] = '********';
    });
    return sanitized;
  }

  private sanitizeResponse(res: any): any {
    if (!res) return res;
    // can add more complex sanitization here if needed
    return res;
  }

  private isRateLimited(
    rateLimitIdentifier: string,
    userAgent: string,
  ): boolean {
    if (!rateLimitIdentifier) return false;

    const entry = this.requestsMap.get(rateLimitIdentifier);

    if (entry) {
      entry.count++;
      if (entry.count > this.MAX_REQUESTS) {
        return true;
      }
    } else {
      const timer = setTimeout(() => {
        this.requestsMap.delete(rateLimitIdentifier);
      }, this.TIME_WINDOW);

      this.requestsMap.set(rateLimitIdentifier, { count: 1, timer, userAgent });
    }

    return false;
  }
}
