import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentServiceItemDto {
  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  publicAvailability!: string;

  @ApiProperty()
  applicationVolume!: number;

  @ApiProperty()
  backlog!: number;

  @ApiProperty()
  unresolvedDependencyCount!: number;

  @ApiProperty()
  slaStatus!: string;

  @ApiProperty()
  serviceSuspended!: boolean;

  @ApiPropertyOptional({ nullable: true })
  version!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  versionId!: string | null;
}

export class DepartmentServicesResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ type: [DepartmentServiceItemDto] })
  items!: DepartmentServiceItemDto[];

  @ApiProperty()
  suspendedServiceCount!: number;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
