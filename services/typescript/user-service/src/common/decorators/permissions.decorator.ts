import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../../admin/permission/entities/permission.entity';

export const PERMISSION_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
