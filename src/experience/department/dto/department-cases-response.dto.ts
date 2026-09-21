import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentCaseAssigneeDto {
  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  assignmentRole!: string;
}

class DepartmentCaseManagerDto {
  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty()
  name!: string;
}

class DepartmentCaseItemDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty()
  openedAt!: string;

  @ApiPropertyOptional({ type: DepartmentCaseManagerDto, nullable: true })
  caseManager!: DepartmentCaseManagerDto | null;

  @ApiProperty({ type: [DepartmentCaseAssigneeDto] })
  activeAssignees!: DepartmentCaseAssigneeDto[];
}

export class DepartmentCasesResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  totalCount!: number;

  @ApiProperty({ type: [DepartmentCaseItemDto] })
  items!: DepartmentCaseItemDto[];

  @ApiProperty()
  aggregateDoesNotCreateCaseDisposition!: boolean;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
