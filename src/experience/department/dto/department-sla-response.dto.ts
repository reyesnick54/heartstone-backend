import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentSlaClockDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  clockKey!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  pausedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;
}

class DepartmentAtRiskMilestoneDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  milestoneName!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  targetDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sourceSlaReference!: string | null;
}

export class DepartmentSlaResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  casesApproachingSla!: number;

  @ApiProperty()
  overdueCases!: number;

  @ApiProperty({ type: [DepartmentSlaClockDto] })
  activeClocks!: DepartmentSlaClockDto[];

  @ApiProperty({ type: [DepartmentAtRiskMilestoneDto] })
  atRiskMilestones!: DepartmentAtRiskMilestoneDto[];

  @ApiProperty()
  doesNotCalculateLegalConclusions!: boolean;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
