import { PartialType } from '@nestjs/swagger';
import { CreateUserSecurityQuestionDto } from './create-user-security-question.dto';

export class UpdateUserSecurityQuestionDto extends PartialType(
  CreateUserSecurityQuestionDto,
) {}
