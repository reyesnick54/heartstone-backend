import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentAppealItemDto {
  @ApiProperty({ format: 'uuid' })
  redressMatterId!: string;

  @ApiProperty()
  redressMatterNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  filedAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  caseId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  caseNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  serviceName!: string | null;
}

export class DepartmentAppealsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  activeAppealsCount!: number;

  @ApiProperty({ type: [DepartmentAppealItemDto] })
  items!: DepartmentAppealItemDto[];

  @ApiProperty()
  restrictedApplicantDetailsExcluded!: boolean;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
