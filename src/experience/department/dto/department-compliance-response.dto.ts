import { ApiProperty } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentComplianceMatterDto {
  @ApiProperty({ format: 'uuid' })
  complianceMatterId!: string;

  @ApiProperty()
  complianceMatterNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  openedAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  caseId!: string | null;
}

class DepartmentComplianceIndicatorDto {
  @ApiProperty()
  indicatorType!: string;

  @ApiProperty()
  displayLabel!: string;

  @ApiProperty()
  countValue!: number;
}

class DepartmentComplianceAlertDto {
  @ApiProperty({ format: 'uuid' })
  alertId!: string;

  @ApiProperty()
  alertLevel!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  isEnforcementFinding!: boolean;
}

export class DepartmentComplianceResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ type: [DepartmentComplianceMatterDto] })
  openMatters!: DepartmentComplianceMatterDto[];

  @ApiProperty()
  overdueObligations!: number;

  @ApiProperty()
  correctiveActions!: number;

  @ApiProperty({ type: [DepartmentComplianceIndicatorDto] })
  indicators!: DepartmentComplianceIndicatorDto[];

  @ApiProperty({ type: [DepartmentComplianceAlertDto] })
  complianceAlerts!: DepartmentComplianceAlertDto[];

  @ApiProperty()
  restrictedInternalRecordsScoped!: boolean;

  @ApiProperty()
  projectionDisclaimer!: string;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
