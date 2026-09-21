import { ApiProperty } from '@nestjs/swagger';

import {
  DepartmentMetricsFreshnessDto,
  DepartmentOfficerWorkloadDistributionDto,
} from './department-common.dto';

class DepartmentStatusBreakdownDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  count!: number;
}

export class DepartmentWorkloadResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  totalCases!: number;

  @ApiProperty()
  totalOpenCases!: number;

  @ApiProperty({ type: [DepartmentStatusBreakdownDto] })
  statusBreakdown!: DepartmentStatusBreakdownDto[];

  @ApiProperty()
  unassignedWorkload!: number;

  @ApiProperty()
  casesAwaitingReview!: number;

  @ApiProperty()
  casesAwaitingApplicantAction!: number;

  @ApiProperty()
  casesAwaitingExternalDependency!: number;

  @ApiProperty()
  decisionReadyCases!: number;

  @ApiProperty({ type: [DepartmentOfficerWorkloadDistributionDto] })
  officerWorkloadDistribution!: DepartmentOfficerWorkloadDistributionDto[];

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  aggregateDoesNotCreateCaseDisposition!: boolean;

  @ApiProperty()
  authorityDisclaimer!: string;
}
