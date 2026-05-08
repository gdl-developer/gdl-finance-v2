import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from './ability.factory';
import { CHECK_ABILITY, RequiredRule } from './abilities.decorator';
import { ForbiddenError } from '@casl/ability';
import { AccessValidator } from '../audit-logger/access-validator/access-validator.service';
import { UserType } from '../audit-logger/entities/audit-logger.entity';

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: AbilityFactory,
    private validatorService: AccessValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules =
      this.reflector.get<RequiredRule[]>(CHECK_ABILITY, context.getHandler()) ||
      [];

    const request = context.switchToHttp().getRequest();

    const refresh_token = await this.validatorService.validateHeaders(
      request.headers,
    );

    // validate token to get the user/admin id and role
    const { user_type, user_id, ...rest } =
      await this.validatorService.getUserWithRefreshToken(refresh_token);

    // ✅ Explicitly attach user object to request for controller access
    // We use 'staffId' to maintain compatibility with existing controllers
    request.user = {
      staffId: user_id,
      user_type,
      ...rest,
    };

    console.log('user_type', user_type);
    console.log('user_id from validator', user_id, typeof user_id);

    if (isNaN(Number(user_id))) {
      console.error('CRITICAL: user_id is NaN!');
    }

    if (user_type == UserType.USER) {
      const request_user_id =
        request['params'].id ||
        request['params'].user_id ||
        request['body'].user_id;

      await this.valideteUserId(user_id, request_user_id);
    }

    const ability = this.caslAbilityFactory.defineAbility(user_type, user_id);

    try {
      rules.forEach((rule) =>
        ForbiddenError.from(ability).throwUnlessCan(rule.action, rule.subject),
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      console.error('Unexpected error in AbilitiesGuard:', error);
      throw new ForbiddenException(
        'Authorization check failed due to an internal error',
      );
    }
  }

  async valideteUserId(token_user_id: number, request_user_id: number) {
    console.log('user_id in token', token_user_id);
    console.log('user_id in request', request_user_id);

    if (token_user_id != request_user_id) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }
  }
}
