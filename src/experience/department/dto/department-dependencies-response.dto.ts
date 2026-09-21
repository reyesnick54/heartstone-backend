import { ApiProperty } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentPendingReferralDto {
  @ApiProperty({ format: 'uuid' })
  referralId!: string;

  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  caseStatus!: string;

  @ApiProperty()
  referralStatus!: string;
}

class DepartmentPendingExternalCaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  status!: string;
}

class DepartmentExternalDeterminationDto {
  @ApiProperty({ format: 'uuid' })
  determinationId!: string;

  @ApiProperty({ format: 'uuid' })
  authorityDependencyId!: string;

  @ApiProperty()
  determinationStatus!: string;

  @ApiProperty()
  receivedAt!: string;
}

export class DepartmentDependenciesResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ type: [DepartmentPendingReferralDto] })
  pendingReferrals!: DepartmentPendingReferralDto[];

  @ApiProperty({ type: [DepartmentPendingExternalCaseDto] })
  pendingExternalCases!: DepartmentPendingExternalCaseDto[];

  @ApiProperty({ type: [DepartmentExternalDeterminationDto] })
  externalDeterminations!: DepartmentExternalDeterminationDto[];

  @ApiProperty()
  unresolvedCount!: number;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
