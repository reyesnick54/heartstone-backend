import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WorkspaceCaseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  assignedOfficeholderName!: string | null;

  @ApiProperty()
  accessKind!: string;
}

class WorkspaceCountSummaryDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [WorkspaceCaseSummaryDto] })
  items!: WorkspaceCaseSummaryDto[];
}

class WorkspaceSlaRiskDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  clockKey!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  targetAt!: string | null;
}

class WorkspaceAlertSummaryDto {
  @ApiProperty({ format: 'uuid' })
  alertId!: string;

  @ApiProperty()
  alertNumber!: string;

  @ApiProperty()
  observedCondition!: string;

  @ApiProperty()
  status!: string;
}

export class OfficialWorkspaceResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  assignedCases!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  departmentUnassignedCases!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  casesAwaitingReview!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  completenessIssues!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  informationRequests!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  pendingReferrals!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  decisionReadyCases!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: [WorkspaceSlaRiskDto] })
  slaRisks!: WorkspaceSlaRiskDto[];

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  inspectionTasks!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  appealsAssignments!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  expiringInstruments!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: WorkspaceCountSummaryDto })
  governmentMessages!: WorkspaceCountSummaryDto;

  @ApiProperty({ type: [WorkspaceAlertSummaryDto] })
  intelligenceAlerts!: WorkspaceAlertSummaryDto[];

  @ApiProperty()
  assignmentDoesNotImplyAuthority!: true;
}
