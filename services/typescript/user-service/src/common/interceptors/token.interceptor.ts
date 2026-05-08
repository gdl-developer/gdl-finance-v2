import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class TokenInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TokenInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extract the request from execution context
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    // Extract refresh token
    const refreshToken = this.getTokenFromHeaders(request);

    if (!refreshToken) {
      this.logger.warn('⚠️ No bearerAuth token found in request headers');
    } else {
      // Store the token in the request object for later access
      request['refreshToken'] = refreshToken;
      this.logger.debug(`🔑 Refresh token extracted and stored in request`);
    }

    return next.handle();
  }

  private getTokenFromHeaders(request: Request): string | null {
    // Normalize headers for case insensitivity
    const headers = request.headers;

    // Support both 'bearerauth' and 'BearerAuth' just in case
    const token =
      headers['bearerauth'] ||
      headers['BearerAuth'] ||
      headers['authorization'];

    if (!token) return null;

    // If Authorization header is used, extract token after 'Bearer '
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      return token.split(' ')[1];
    }

    return typeof token === 'string' ? token : null;
  }
}
