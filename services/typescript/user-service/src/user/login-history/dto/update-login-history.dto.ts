import { PartialType } from '@nestjs/swagger';
import { CreateLoginHistoryDto } from './create-login-history.dto';

export class UpdateLoginHistoryDto extends PartialType(CreateLoginHistoryDto) {}
