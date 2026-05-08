import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthUtilsService } from '../../sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { Request } from 'express';
import { EnvService } from '../../common/env.service';

@Injectable()
export class FlexiAuthGuard implements CanActivate {
  private readonly logger = new Logger(FlexiAuthGuard.name);
  private readonly REFRESH_AUTH: string;

  constructor(
    private reflector: Reflector,
    private jwtAuthUtilsService: JwtAuthUtilsService,
    private envService: EnvService,
  ) {
    this.REFRESH_AUTH = this.envService.read().REFRESH_AUTH;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Try validating as standard User/Agent (ACCESS_AUTH) this is serious
    try {
      const clientIp = '0.0.0.0';
      const payload = await this.jwtAuthUtilsService.validateToken(
        token,
        clientIp,
        false,
      );
      request['user'] = payload;
      return true;
    } catch (userError) {
      try {
        const adminPayload =
          await this.jwtAuthUtilsService.validateRefreshToken(
            token,
            this.REFRESH_AUTH,
          );
        request['user'] = adminPayload;
        return true;
      } catch (adminError) {
        this.logger.error(
          `Token validation failed for both User and Admin strategies`,
        );
        throw new UnauthorizedException('Invalid token');
      }
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const headers = request.headers;
    const token =
      headers['bearerauth'] ||
      headers['BearerAuth'] ||
      headers['authorization'];

    if (!token) return undefined;

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      return token.split(' ')[1];
    }

    return typeof token === 'string' ? token : undefined;
  }
}
