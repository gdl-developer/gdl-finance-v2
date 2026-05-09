import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserType } from '../../admin/entities/admin.entity';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Support both direct user_type or nested user.user_type
    const userType = user.user_type || user.user?.user_type;

    return userType === 'SUPER_ADMIN';
  }
}
