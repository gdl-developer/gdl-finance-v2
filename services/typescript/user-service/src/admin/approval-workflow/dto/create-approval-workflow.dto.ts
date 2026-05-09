import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsPositive,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ApprovalWorkflowStepDto {
  @ApiProperty({
    description: 'The staff ID of the admin for this step',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Admin ID is required' })
  @IsInt({ message: 'Admin ID must be an integer' })
  @IsPositive({ message: 'Admin ID must be a positive number' })
  @Min(1, { message: 'Admin ID must be at least 1' })
  admin_id: number;

  @ApiProperty({
    description: 'The level of this approval step (1, 2, 3...)',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty({ message: 'Level is required' })
  @IsInt({ message: 'Level must be an integer' })
  @IsPositive({ message: 'Level must be a positive number' })
  @Min(1, { message: 'Level must be at least 1' })
  @Max(100, { message: 'Level cannot exceed 100' })
  level: number;

  @ApiProperty({
    description: 'Whether to enforce branch restriction for this step',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  enforce_branch_restriction?: boolean;
}

export class CreateApprovalWorkflowDto {
  @ApiProperty({
    description: 'The name of the workflow',
    example: 'Investment Approval Workflow',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Workflow name is required' })
  @IsString({ message: 'Workflow name must be a string' })
  @MinLength(3, { message: 'Workflow name must be at least 3 characters' })
  @MaxLength(100, { message: 'Workflow name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  workflow_name: string;

  @ApiProperty({
    description: 'The module associated with this workflow',
    example: 'Flexi Automation',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Module is required' })
  @IsString({ message: 'Module must be a string' })
  @MaxLength(50, { message: 'Module cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  module: string;

  @ApiProperty({
    description: 'Description of the workflow',
    example: 'Workflow for approving large investments',
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
    minItems: 1,
    maxItems: 20,
  })
  @IsArray({ message: 'Steps must be an array' })
  @ArrayMinSize(1, { message: 'At least one approval step is required' })
  @ArrayMaxSize(20, { message: 'Cannot exceed 20 approval steps' })
  @ValidateNested({ each: true })
  @Type(() => ApprovalWorkflowStepDto)
  steps: ApprovalWorkflowStepDto[];
}
