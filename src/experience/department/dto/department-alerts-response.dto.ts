import { ApiProperty } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentAlertItemDto {
  @ApiProperty()
  alertType!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  observedAt!: string;

  @ApiProperty()
  referenceId!: string;

  @ApiProperty()
  isEnforcementFinding!: boolean;
}

export class DepartmentAlertsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ type: [DepartmentAlertItemDto] })
  items!: DepartmentAlertItemDto[];

  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  alertDisclaimer!: string;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
