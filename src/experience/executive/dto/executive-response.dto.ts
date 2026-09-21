import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExecutiveDisclaimersDto {
  @ApiProperty()
  projection!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  visibilityDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  statusDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  executiveDashboardIsNotCommandAuthority!: boolean;
}

class ExecutiveIndicatorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  count!: number;

  @ApiPropertyOptional()
  score!: number | null;

  @ApiProperty()
  dataQuality!: string;

  @ApiProperty()
  isStale!: boolean;

  @ApiProperty()
  staleDataFlagged!: boolean;

  @ApiProperty()
  visibilityDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  metricIsNotVerifiedLegalFact!: boolean;
}

class ExecutiveBriefingScopeDto {
  @ApiProperty({ format: 'uuid' })
  dashboardDefinitionId!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  dashboardCode!: string;

  @ApiProperty()
  dashboardName!: string;
}

class ExecutiveGovernmentOperationsSummaryDto {
  @ApiProperty()
  applicationsReceived!: number;

  @ApiProperty()
  openCases!: number;

  @ApiProperty()
  completedCases!: number;

  @ApiProperty()
  overdueCases!: number;

  @ApiProperty()
  activeGovernmentServices!: number;

  @ApiPropertyOptional()
  medianProcessingTimeMs!: number | null;

  @ApiPropertyOptional()
  averageProcessingTimeMs!: number | null;
}

class ExecutiveGovernmentOperationsDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty({ type: ExecutiveGovernmentOperationsSummaryDto })
  summary!: ExecutiveGovernmentOperationsSummaryDto;

  @ApiProperty({ type: [ExecutiveIndicatorDto] })
  indicators!: ExecutiveIndicatorDto[];

  @ApiProperty({ type: ExecutiveDisclaimersDto })
  disclaimers!: ExecutiveDisclaimersDto;
}

class ExecutiveHomeResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty({ type: [ExecutiveBriefingScopeDto] })
  briefingScopes!: ExecutiveBriefingScopeDto[];

  @ApiProperty({ type: ExecutiveGovernmentOperationsDto })
  governmentOperations!: ExecutiveGovernmentOperationsDto;

  @ApiProperty()
  economyInvestment!: Record<string, unknown>;

  @ApiProperty()
  compliance!: Record<string, unknown>;

  @ApiProperty()
  digitalGovernment!: Record<string, unknown>;

  @ApiProperty()
  risk!: Record<string, unknown>;

  @ApiProperty()
  staleProjectionCount!: number;

  @ApiProperty()
  hasStaleProjections!: boolean;

  @ApiProperty()
  authorityDisclaimer!: string;

  @ApiProperty()
  visibilityDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  executiveDashboardIsNotCommandAuthority!: boolean;

  @ApiProperty()
  metricIsNotVerifiedLegalFact!: boolean;

  @ApiProperty()
  projectionIsNotGuarantee!: boolean;

  @ApiProperty()
  riskScoreIsNotSanction!: boolean;
}

class ExecutiveSectionResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty({ type: [ExecutiveIndicatorDto] })
  indicators!: ExecutiveIndicatorDto[];

  @ApiProperty({ type: ExecutiveDisclaimersDto })
  disclaimers!: ExecutiveDisclaimersDto;
}

class ExecutiveAlertItemDto {
  @ApiProperty({ format: 'uuid' })
  alertId!: string;

  @ApiProperty()
  alertNumber!: string;

  @ApiProperty()
  observedCondition!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isConfirmedViolation!: boolean;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  hasVerificationRecord!: boolean;

  @ApiProperty()
  aiAlertIsNotConfirmedViolationWithoutVerification!: boolean;
}

class ExecutiveAlertsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty({ type: [ExecutiveAlertItemDto] })
  alerts!: ExecutiveAlertItemDto[];

  @ApiProperty()
  disclaimers!: Record<string, boolean>;
}

export {
  ExecutiveAlertsResponseDto,
  ExecutiveDisclaimersDto,
  ExecutiveGovernmentOperationsDto,
  ExecutiveHomeResponseDto,
  ExecutiveIndicatorDto,
  ExecutiveSectionResponseDto,
};
