import { PartialType } from '@nestjs/swagger';
import { CreateReportingDto } from './create-reporting.dto';

export class UpdateReportingDto extends PartialType(CreateReportingDto) {}
