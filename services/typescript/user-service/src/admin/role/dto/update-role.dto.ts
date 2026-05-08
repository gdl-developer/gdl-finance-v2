import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateAdminRoleDto) {}
