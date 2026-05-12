import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedRequest } from '../../auth/interfaces/request.interface';
import { IdentityResponse } from '../../auth/interfaces/identity.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const profile = (await firstValueFrom(
      this.authService.getProfile(user.user_id),
    )) as IdentityResponse;

    if (!profile || (!profile.role && profile.user_type !== 'SUPER_ADMIN')) {
      throw new ForbiddenException(
        'User has no assigned role and is not a super admin',
      );
    }

    // Bypass check for SUPER_ADMIN
    if (
      profile.user_type === 'SUPER_ADMIN' ||
      (profile.role && profile.role.name === 'SUPER_ADMIN')
    ) {
      return true;
    }

    const userPermissions = profile.role?.permissions || [];

    // Check if user has ALL required permissions
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
