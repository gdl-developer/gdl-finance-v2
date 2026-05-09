import { ApiProperty } from '@nestjs/swagger';
import { Company_profile } from '../entities/company.entity';

export class CompanyPaginatedResponseDto {
  @ApiProperty({ type: [Company_profile], description: 'List of companies' })
  companies: Company_profile[];

  @ApiProperty({
    example: 100,
    description: 'Total number of companies matching the query',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;
}
