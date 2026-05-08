import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  CreateApprovalWorkflowDto,
  ApprovalWorkflowStepDto,
} from './create-approval-workflow.dto';

export class UpdateApprovalWorkflowDto extends PartialType(
  CreateApprovalWorkflowDto,
) {
  @ApiProperty({
    description: 'The name of the workflow',
    example: 'Updated Investment Approval Workflow',
    required: false,
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Workflow name must be a string' })
  @MinLength(3, { message: 'Workflow name must be at least 3 characters' })
  @MaxLength(100, { message: 'Workflow name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  workflow_name?: string;

  @ApiProperty({
    description: 'The module associated with this workflow',
    example: 'Flexi Automation',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Module must be a string' })
  @MaxLength(50, { message: 'Module cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  module?: string;

  @ApiProperty({
    description: 'Description of the workflow',
    example: 'Updated workflow description',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'List of approval steps (minimum 1, maximum 20)',
    type: [ApprovalWorkflowStepDto],
    required: false,
    minItems: 1,
    maxItems: 20,
  })
  @IsOptional()
  @IsArray({ message: 'Steps must be an array' })
  @ArrayMinSize(1, { message: 'At least one approval step is required' })
  @ArrayMaxSize(20, { message: 'Cannot exceed 20 approval steps' })
  @ValidateNested({ each: true })
  @Type(() => ApprovalWorkflowStepDto)
  steps?: ApprovalWorkflowStepDto[];
}
