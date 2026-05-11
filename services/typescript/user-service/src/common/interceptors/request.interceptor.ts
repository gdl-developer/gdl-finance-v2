import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  NotAcceptableException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { EnvService } from '../env.service';
import { encrypt, decrypt } from '../utils/crypto-hash-helper';

const env_config = new EnvService().read();
const SYS_AUTH = env_config.SYS_AUTH;
const EKY = env_config.EKY;

export interface Request<T> {
  data: T;
}

@Injectable()
export class RequestInterceptor<T> implements NestInterceptor<T, Request<T>> {
  private readonly logger = new Logger(RequestInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<Request<T>>> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // ✅ Skip auth for public routes
    if (isPublic) {
      this.logger.debug(
        'Public route detected — skipping RequestInterceptor auth check',
      );
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const headers = request.rawHeaders || [];

    // ✅ Ensure header key exists
    const bearerIndex = headers.findIndex(
      (header: string) =>
        header.toLowerCase() === 'bearerauth' ||
        header.toLowerCase() === 'authorization',
    );

    if (bearerIndex === -1 || !headers[bearerIndex + 1]) {
      this.logger.warn('Missing or invalid authentication header');
      throw new NotAcceptableException(
        'Unauthorized Request: Missing auth header',
      );
    }

    let authToken = headers[bearerIndex + 1];
    if (authToken.startsWith('Bearer ')) {
      authToken = authToken.split(' ')[1];
    }
    const decryptedAuth = await this.decryptKeys(authToken);

    if (decryptedAuth !== SYS_AUTH) {
      this.logger.warn(`Unauthorized Request: Invalid SYS_AUTH token`);
      throw new NotAcceptableException('Unauthorized Request: Invalid token');
    }

    this.logger.debug(
      'RequestInterceptor: Authorization validated successfully',
    );
    return next.handle();
  }

  private async decryptKeys(token: string): Promise<string> {
    try {
      return decrypt(token, EKY);
    } catch (err) {
      this.logger.error('Error decrypting token', err.stack);
      throw new NotAcceptableException(
        'Invalid encryption key or malformed token',
      );
    }
  }

  async encryptKeys(): Promise<void> {
    const encrypted = encrypt(SYS_AUTH, EKY);
    this.logger.log(`Encrypted SYS_AUTH for reference: ${encrypted}`);
  }
}
