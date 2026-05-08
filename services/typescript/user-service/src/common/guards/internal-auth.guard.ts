import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InternalSecurityService } from '../utils/internal-security.service';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    private readonly internalSecurityService: InternalSecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const signature = request.headers['x-gdl-signature'];
    const timestamp = request.headers['x-gdl-timestamp'];
    const method = request.method;
    const path = request.url;
    const body = request.body;

    if (!signature || !timestamp) {
      console.warn('❌ InternalAuthGuard: Missing signature or timestamp');
      throw new UnauthorizedException('Internal signature required');
    }

    const isValid = this.internalSecurityService.verifySignature(
      signature as string,
      timestamp as string,
      method,
      path,
      body,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid internal signature');
    }

    return true;
  }
}
