import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OfficialCaseListItemDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  accessKind!: string;

  @ApiPropertyOptional()
  assignedOfficeholderName!: string | null;

  @ApiProperty()
  openedAt!: string;
}

export class OfficialCasesListResponseDto {
  @ApiProperty({ type: [OfficialCaseListItemDto] })
  items!: OfficialCaseListItemDto[];

  @ApiProperty()
  totalCount!: number;
}

class OfficialCaseWorkflowStepDto {
  @ApiProperty()
  stepKey!: string;

  @ApiPropertyOptional()
  stepLabel!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  stepType!: string;
}

export class OfficialCaseDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiProperty()
  accessKind!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  caseManagerOfficeholderId!: string | null;

  @ApiPropertyOptional()
  caseManagerName!: string | null;

  @ApiProperty({ type: [OfficialCaseWorkflowStepDto] })
  activeWorkflowSteps!: OfficialCaseWorkflowStepDto[];

  @ApiProperty()
  openedAt!: string;

  @ApiProperty()
  assignmentDoesNotImplyAuthority!: true;
}
