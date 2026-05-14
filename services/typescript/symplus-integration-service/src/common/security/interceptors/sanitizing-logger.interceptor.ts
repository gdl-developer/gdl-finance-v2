import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class SanitizingLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  // Fields to redact from logs
  private readonly sensitiveFields = [
    "password",
    "Password",
    "BankAcctNumber",
    "bvn",
    "BVN",
    "phone",
    "Telephone",
    "email",
    "EmailAddress",
    "bearerauth",
    "authorization",
    "token",
    "apiKey",
    "API_KEY",
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query } = request;
    const userAgent = request.get("user-agent") || "";
    const ip = request.ip;

    const now = Date.now();

    // Log sanitized request
    this.logger.log(
      `→ ${method} ${url} from ${ip} - ${userAgent.substring(0, 50)}`
    );

    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeObject(body);
      this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    if (query && Object.keys(query).length > 0) {
      const sanitizedQuery = this.sanitizeObject(query);
      this.logger.debug(`Query params: ${JSON.stringify(sanitizedQuery)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `← ${method} ${url} ${
              context.switchToHttp().getResponse().statusCode
            } - ${responseTime}ms`
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `← ${method} ${url} ${error.status || 500} - ${responseTime}ms - ${
              error.message
            }`
          );
        },
      })
    );
  }

  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.redactValue(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    return this.sensitiveFields.some((sensitive) =>
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private redactValue(value: any): string {
    if (typeof value === "string") {
      if (value.length <= 4) {
        return "***";
      }
      // Show first 2 and last 2 characters
      return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
    }
    return "***";
  }
}
