import {
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from '@casl/ability';

import { Injectable } from '@nestjs/common';
import { UserType } from '../audit-logger/entities/audit-logger.entity';
import { UserAccount } from '../../user/user/entities/user.entity';
import { Admin } from '../../admin/admin/entities/admin.entity';
import { KycLevel } from 'src/kyc-levels/entities/kyc-level.entity';
import { SecurityQuestion } from 'src/security-questions/entities/security-question.entity';
import { Reporting } from 'src/reporting/entities/reporting.entity';
import { AuditLogger } from '../audit-logger/entities/audit-logger.entity';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  CreateAdmin = 'create_admin',
  CreateCDNCredential = 'create_cdn_credential',
  Read = 'read',
  ReadOne = 'read_one',
  ReadAll = 'read_all',
  Update = 'update',
  Delete = 'delete',
}

export type Subjects =
  | InferSubjects<
      | typeof UserAccount
      | typeof Admin
      | typeof KycLevel
      | typeof SecurityQuestion
      | typeof Reporting
      | typeof AuditLogger
      | 'any'
    >
  | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class AbilityFactory {
  defineAbility(user_type_input: UserType | string, user_id: number) {
    const user_type =
      typeof user_type_input === 'string'
        ? user_type_input.trim().toUpperCase()
        : user_type_input;
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility as unknown as AbilityClass<AppAbility>,
    );

    switch (user_type) {
      case 'SUPER_ADMIN':
        can(Action.Manage, 'all');
        can(Action.Manage, AuditLogger);
        break;

      case 'ADMIN':
        can(Action.Read, 'all');
        can(Action.ReadAll, 'all');
        can(Action.Create, 'all');
        can(Action.Update, 'all');
        can(Action.CreateCDNCredential, 'all');
        cannot(Action.Read, AuditLogger).because('Super Admin Only');
        cannot(Action.ReadAll, AuditLogger).because('Super Admin Only');
        cannot(Action.Delete, 'all').because('Insufficient Privileges');
        cannot(Action.CreateAdmin, 'all').because('Insufficient Privileges');
        break;

      case 'STAFF':
        can(Action.Read, 'all');
        can(Action.ReadAll, 'all');
        cannot(Action.Read, AuditLogger).because('Super Admin Only');
        cannot(Action.ReadAll, AuditLogger).because('Super Admin Only');
        cannot(Action.Delete, 'all').because('Insufficient Privileges');
        cannot(Action.CreateAdmin, 'all').because('Insufficient Privileges');
        break;

      case 'USER':
        // can(Action.Read, 'all');
        can(Action.Manage, 'all', { user_id: user_id }).because(
          'You can only read your own user data',
        );
        cannot(Action.ReadAll, 'all').because(
          'You can only read your own user data',
        );
        cannot(Action.Manage, 'all', { staffId: { $ne: user_id } }).because(
          'You can only read your own user data',
        );
        cannot(Action.Read, AuditLogger).because('Insufficient Privileges');
        cannot(Action.ReadAll, AuditLogger).because('Insufficient Privileges');
        cannot(Action.Delete, 'all').because('Insufficient Privileges');
        break;

      case 'MICRO_SERVICE':
        can(Action.Manage, 'all');
        break;

      default:
        cannot(Action.Manage, 'all').because('Undefined User Privileges');
        break;
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
