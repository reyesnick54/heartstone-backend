import { ApiProperty } from '@nestjs/swagger';

import {
  DepartmentMetricsFreshnessDto,
  DepartmentOfficerWorkloadDistributionDto,
  DepartmentServiceAvailabilityDto,
} from './department-common.dto';

export class DepartmentHomeResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  applicationsReceived!: number;

  @ApiProperty()
  openCases!: number;

  @ApiProperty()
  casesCompleted!: number;

  @ApiProperty()
  casesAwaitingReview!: number;

  @ApiProperty()
  casesAwaitingApplicantAction!: number;

  @ApiProperty()
  casesAwaitingExternalDependency!: number;

  @ApiProperty()
  decisionReadyCases!: number;

  @ApiProperty()
  casesApproachingSla!: number;

  @ApiProperty()
  overdueCases!: number;

  @ApiProperty()
  unassignedWorkload!: number;

  @ApiProperty({ type: [DepartmentOfficerWorkloadDistributionDto] })
  officerWorkloadDistribution!: DepartmentOfficerWorkloadDistributionDto[];

  @ApiProperty()
  inspectionBacklog!: number;

  @ApiProperty()
  complianceMatters!: number;

  @ApiProperty()
  correctiveActions!: number;

  @ApiProperty()
  activeAppeals!: number;

  @ApiProperty()
  expiringLicensesPermits!: number;

  @ApiProperty({ type: [DepartmentServiceAvailabilityDto] })
  serviceAvailability!: DepartmentServiceAvailabilityDto[];

  @ApiProperty()
  suspendedServices!: number;

  @ApiProperty()
  integrationIssues!: number;

  @ApiProperty()
  departmentalAlerts!: number;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  aggregateDoesNotCreateCaseDisposition!: boolean;

  @ApiProperty()
  dashboardVisibilityDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  aggregateDisclaimer!: string;

  @ApiProperty()
  authorityDisclaimer!: string;
}
