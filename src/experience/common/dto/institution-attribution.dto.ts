import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstitutionAttributionDto {
  @ApiProperty()
  institutionId!: string;

  @ApiProperty()
  institutionCode!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiPropertyOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiPropertyOptional()
  serviceId?: string;

  @ApiPropertyOptional()
  serviceSlug?: string;

  @ApiPropertyOptional()
  serviceName?: string;
}
