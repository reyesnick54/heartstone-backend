import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AIAgentStatus,
  AIModelStatus,
  AIUseCaseStatus,
  AlertVerificationOutcome,
  MetricCalculationRunStatus,
  MetricDataQualityStatus,
  MonitoringAlertStatus,
  PerformanceClaimStatus,
  ReportClaimStatus,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';

import {
  AI_ACTION_REASON_MAP,
  FORBIDDEN_AI_ACTIONS,
  FORBIDDEN_ANALYTICS_PATCH_TARGETS,
  FORBIDDEN_CLIENT_AI_EXECUTION_FIELDS,
  FORBIDDEN_CLIENT_DASHBOARD_FIELDS,
  FORBIDDEN_CLIENT_METRIC_FIELDS,
  FORBIDDEN_CLIENT_PERFORMANCE_CLAIM_FIELDS,
  INTELLIGENCE_REASON_CODES,
  type IntelligenceInvariantCode,
  MUST_FAIL_INVARIANTS,
  PROMPT_INJECTION_PATTERNS,
} from '../intelligence.constants';

@Injectable()
export class IntelligenceBoundaryService {
  rejectDashboardAuthorityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_DASHBOARD_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${INTELLIGENCE_REASON_CODES.DASHBOARD_CLIENT_AUTHORITY_FIELDS_FORBIDDEN}: client may not set "${field}"`,
        );
      }
    }
  }

  assertDashboardCannotCreateAuthority(requested: boolean): void {
    if (requested) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_CANNOT_CREATE_AUTHORITY);
    }
  }

  assertDashboardCannotGrantDelegation(requested: boolean): void {
    if (requested) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_CANNOT_GRANT_DELEGATION);
    }
  }

  assertDashboardViewNotAuthority(context?: string): void {
    if (context?.toLowerCase().includes('authority granted via dashboard')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_VIEW_NOT_AUTHORITY);
    }
  }

  assertIndicatorNotDecision(context?: string): void {
    if (context?.toLowerCase().includes('indicator constitutes decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.INDICATOR_NOT_DECISION);
    }
  }

  assertExecutiveDashboardNotCommand(context?: string): void {
    if (context?.toLowerCase().includes('executive command issued')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.EXECUTIVE_DASHBOARD_NOT_COMMAND);
    }
  }

  assertDepartmentalConsoleNotDisposition(context?: string): void {
    if (context?.toLowerCase().includes('case disposition recorded')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DEPARTMENTAL_CONSOLE_NOT_DISPOSITION);
    }
  }

  assertDashboardSnapshotNotOfficialRecord(context?: string): void {
    if (context?.toLowerCase().includes('snapshot is official record')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_SNAPSHOT_NOT_OFFICIAL_RECORD);
    }
  }

  assertDashboardWidgetNotInstrument(context?: string): void {
    if (context?.toLowerCase().includes('widget is official instrument')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_WIDGET_NOT_INSTRUMENT);
    }
  }

  assertDashboardProjectionNotVerifiedOutcome(context?: string): void {
    if (context?.toLowerCase().includes('projection verified outcome')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DASHBOARD_PROJECTION_NOT_VERIFIED_OUTCOME);
    }
  }

  assertStaleIndicatorBlocksConsequentialUse(isStale: boolean, consequential: boolean): void {
    if (isStale && consequential) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.STALE_INDICATOR_BLOCK_CONSEQUENTIAL_USE);
    }
  }

  rejectAiAction(action: string): void {
    const normalized = action.toUpperCase() as (typeof FORBIDDEN_AI_ACTIONS)[number];
    if (!FORBIDDEN_AI_ACTIONS.includes(normalized)) {
      return;
    }
    const code = AI_ACTION_REASON_MAP[normalized] ?? INTELLIGENCE_REASON_CODES.AI_CANNOT_DECIDE;
    throw new ForbiddenException(code);
  }

  assertAiCannotApprove(action: string): void {
    if (action.toUpperCase() === 'APPROVE') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_APPROVE);
    }
  }

  assertAiCannotRefuse(action: string): void {
    if (action.toUpperCase() === 'REFUSE') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_REFUSE);
    }
  }

  assertAiCannotWaive(action: string): void {
    if (action.toUpperCase() === 'WAIVE') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_WAIVE);
    }
  }

  assertAiCannotSign(action: string): void {
    if (action.toUpperCase() === 'SIGN') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_SIGN);
    }
  }

  assertAiCannotIssue(action: string): void {
    if (action.toUpperCase() === 'ISSUE') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_ISSUE);
    }
  }

  assertAiCannotDecide(action: string): void {
    if (action.toUpperCase() === 'DECIDE' || action.toUpperCase() === 'FINALIZE_DECISION') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_DECIDE);
    }
  }

  assertAiRecommendationNotDecision(context?: string): void {
    if (context?.toLowerCase().includes('recommendation recorded as decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_RECOMMENDATION_NOT_DECISION);
    }
  }

  assertAiExecutionNotBinding(isRecommendatoryOnly: boolean): void {
    if (!isRecommendatoryOnly) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_EXECUTION_NOT_BINDING);
    }
  }

  assertAiCannotFinalizeGovernmentAction(actorIsAi: boolean): void {
    if (actorIsAi) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_FINALIZE_GOVERNMENT_ACTION);
    }
  }

  assertAiCannotExecuteEnforcement(action: string): void {
    if (action.toUpperCase() === 'EXECUTE_ENFORCEMENT') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_EXECUTE_ENFORCEMENT);
    }
  }

  assertAiCannotAppointOfficeholder(action: string): void {
    if (action.toUpperCase() === 'APPOINT_OFFICEHOLDER') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_APPOINT_OFFICEHOLDER);
    }
  }

  assertAiCannotSuspendAuthority(action: string): void {
    if (action.toUpperCase() === 'SUSPEND_AUTHORITY') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_SUSPEND_AUTHORITY);
    }
  }

  assertAiCannotRevokeInstrument(action: string): void {
    if (action.toUpperCase() === 'REVOKE_INSTRUMENT') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_REVOKE_INSTRUMENT);
    }
  }

  assertAiAssistanceNotOfficialActor(actorType: string): void {
    if (actorType === 'AI_ASSISTANCE' || actorType === 'AI_AGENT') {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_ASSISTANCE_NOT_OFFICIAL_ACTOR);
    }
  }

  assertAiOutputRequiresHumanDisposition(
    consequential: boolean,
    hasDisposition: boolean,
  ): void {
    if (consequential && !hasDisposition) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_OUTPUT_REQUIRES_HUMAN_DISPOSITION);
    }
  }

  assertAlertNotViolation(treatingAsViolation: boolean): void {
    if (treatingAsViolation) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ALERT_NOT_VIOLATION);
    }
  }

  assertAlertCannotSelfVerify(selfVerifying: boolean): void {
    if (selfVerifying) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ALERT_CANNOT_SELF_VERIFY);
    }
  }

  assertOpenAlertNotConfirmedBreach(
    status: MonitoringAlertStatus,
    claimingBreach: boolean,
  ): void {
    if (status === MonitoringAlertStatus.OPEN && claimingBreach) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.OPEN_ALERT_NOT_CONFIRMED_BREACH);
    }
  }

  assertMonitoringObservationNotViolation(treatingAsViolation: boolean): void {
    if (treatingAsViolation) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.MONITORING_OBSERVATION_NOT_VIOLATION);
    }
  }

  assertAlertVerificationRequiredForViolation(
    hasVerification: boolean,
    claimingViolation: boolean,
    outcome?: AlertVerificationOutcome,
  ): void {
    if (claimingViolation && !hasVerification) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ALERT_VERIFICATION_REQUIRED_FOR_VIOLATION);
    }
    if (
      claimingViolation &&
      outcome &&
      outcome !== AlertVerificationOutcome.CONFIRMED &&
      outcome !== AlertVerificationOutcome.PARTIALLY_CONFIRMED
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ALERT_VERIFICATION_REQUIRED_FOR_VIOLATION);
    }
  }

  assertCorrelationNotCausation(context?: string): void {
    if (context?.toLowerCase().includes('correlation proves causation')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CORRELATION_NOT_CAUSATION);
    }
  }

  assertForecastNotAchievement(context?: string): void {
    if (context?.toLowerCase().includes('forecast achieved')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.FORECAST_NOT_ACHIEVEMENT);
    }
  }

  assertProjectionNotGuarantee(context?: string): void {
    if (context?.toLowerCase().includes('projection guaranteed')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.PROJECTION_NOT_GUARANTEE);
    }
  }

  assertTrendNotPolicyDirective(context?: string): void {
    if (context?.toLowerCase().includes('trend is policy directive')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.TREND_NOT_POLICY_DIRECTIVE);
    }
  }

  assertAnalysisOptionNotDecision(context?: string): void {
    if (context?.toLowerCase().includes('option selected as decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ANALYSIS_OPTION_NOT_DECISION);
    }
  }

  assertAnalysisFindingNotFinalDetermination(context?: string): void {
    if (context?.toLowerCase().includes('finding is final determination')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ANALYSIS_FINDING_NOT_FINAL_DETERMINATION);
    }
  }

  assertRiskAssessmentNotSanction(context?: string): void {
    if (context?.toLowerCase().includes('risk assessment is sanction')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.RISK_ASSESSMENT_NOT_SANCTION);
    }
  }

  assertSponsorReportNotVerifiedMilestone(status: StrategicProjectMilestoneStatus): void {
    if (status === StrategicProjectMilestoneStatus.REPORTED) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SPONSOR_REPORT_NOT_VERIFIED_MILESTONE);
    }
  }

  assertReportedMilestoneNotCompleted(status: StrategicProjectMilestoneStatus): void {
    if (status === StrategicProjectMilestoneStatus.REPORTED) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.REPORTED_MILESTONE_NOT_COMPLETED);
    }
  }

  assertProjectStatusProjectionNotVerdict(context?: string): void {
    if (context?.toLowerCase().includes('projection is institutional verdict')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.PROJECT_STATUS_PROJECTION_NOT_VERDICT);
    }
  }

  assertCapitalEvidenceNotAuditedFact(context?: string): void {
    if (context?.toLowerCase().includes('capital evidence audited fact')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CAPITAL_EVIDENCE_NOT_AUDITED_FACT);
    }
  }

  assertEmploymentEvidenceNotVerifiedCount(context?: string): void {
    if (context?.toLowerCase().includes('employment count verified')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.EMPLOYMENT_EVIDENCE_NOT_VERIFIED_COUNT);
    }
  }

  assertInfrastructureReportNotDeliveryCertificate(context?: string): void {
    if (context?.toLowerCase().includes('infrastructure report is delivery certificate')) {
      throw new ForbiddenException(
        INTELLIGENCE_REASON_CODES.INFRASTRUCTURE_REPORT_NOT_DELIVERY_CERTIFICATE,
      );
    }
  }

  assertStrategicProjectNotAuthorityProgram(context?: string): void {
    if (context?.toLowerCase().includes('project profile grants authority')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.STRATEGIC_PROJECT_NOT_AUTHORITY_PROGRAM);
    }
  }

  assertTwinNotRealObject(context?: string): void {
    if (context?.toLowerCase().includes('twin is real object')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.TWIN_NOT_REAL_OBJECT);
    }
  }

  assertSimulationCannotUpdateLiveCase(mutatingLiveCase: boolean): void {
    if (mutatingLiveCase) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SIMULATION_CANNOT_UPDATE_LIVE_CASE);
    }
  }

  assertSimulationOutputNotLiveState(applyingToLive: boolean): void {
    if (applyingToLive) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SIMULATION_OUTPUT_NOT_LIVE_STATE);
    }
  }

  assertStaleTwinSafeHalt(isStale: boolean, consequential: boolean): void {
    if (isStale && consequential) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.STALE_TWIN_SAFE_HALT);
    }
  }

  assertConsequentialTwinUseRequiresReview(
    consequential: boolean,
    hasReview: boolean,
  ): void {
    if (consequential && !hasReview) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CONSEQUENTIAL_TWIN_USE_REQUIRES_REVIEW);
    }
  }

  assertSimulationToLiveRequiresApprovedReview(approved: boolean): void {
    if (!approved) {
      throw new ForbiddenException(
        INTELLIGENCE_REASON_CODES.SIMULATION_TO_LIVE_REQUIRES_APPROVED_REVIEW,
      );
    }
  }

  sanitizePromptInjection(input: string): string {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return `[SANITIZED_DATA:${input.replace(/]/g, '')}]`;
      }
    }
    return input;
  }

  assertPromptInjectionTreatedAsData(original: string, sanitized: string): void {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(original) && original === sanitized) {
        throw new BadRequestException(INTELLIGENCE_REASON_CODES.PROMPT_INJECTION_TREATED_AS_DATA);
      }
    }
  }

  assertCrossCaseRetrievalBlocked(
    requestCaseId: string | null | undefined,
    targetCaseId: string | null | undefined,
  ): void {
    if (requestCaseId && targetCaseId && requestCaseId !== targetCaseId) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CROSS_CASE_RETRIEVAL_BLOCKED);
    }
  }

  assertSuspendedModelBlocked(status: AIModelStatus): void {
    if (status === AIModelStatus.SUSPENDED) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SUSPENDED_MODEL_BLOCKED);
    }
  }

  assertSuspendedUseCaseBlocked(status: AIUseCaseStatus): void {
    if (status === AIUseCaseStatus.SUSPENDED) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SUSPENDED_USE_CASE_BLOCKED);
    }
  }

  assertSuspendedAgentBlocked(status: AIAgentStatus): void {
    if (status === AIAgentStatus.SUSPENDED) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SUSPENDED_AGENT_BLOCKED);
    }
  }

  rejectAnalyticsPatchTargets(payload: Record<string, unknown>): void {
    for (const [field, value] of Object.entries(payload)) {
      if (value === undefined) {
        continue;
      }
      const normalized = field.toLowerCase();
      const forbidden = FORBIDDEN_ANALYTICS_PATCH_TARGETS.some(
        (target) => normalized === target.toLowerCase() || normalized.includes(target.toLowerCase()),
      );
      if (!forbidden) {
        continue;
      }
      if (normalized.includes('instrument')) {
        throw new ForbiddenException(
          INTELLIGENCE_REASON_CODES.ANALYTICS_CANNOT_PATCH_OFFICIAL_INSTRUMENT,
        );
      }
      throw new ForbiddenException(
        INTELLIGENCE_REASON_CODES.ANALYTICS_CANNOT_PATCH_GOVERNMENT_DECISION,
      );
    }
  }

  assertMetricObservationNotPerformanceVerdict(context?: string): void {
    if (context?.toLowerCase().includes('observation is performance verdict')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.METRIC_OBSERVATION_NOT_PERFORMANCE_VERDICT);
    }
  }

  assertPerformanceClaimNotDecision(context?: string): void {
    if (context?.toLowerCase().includes('claim is government decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.PERFORMANCE_CLAIM_NOT_DECISION);
    }
  }

  assertUnverifiedPerformanceClaimNotPublishedFact(status: PerformanceClaimStatus): void {
    const unverified =
      status === PerformanceClaimStatus.DRAFT ||
      status === PerformanceClaimStatus.SUBMITTED ||
      status === PerformanceClaimStatus.UNDER_REVIEW;
    if (unverified) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.UNVERIFIED_CLAIM_NOT_PUBLISHED_FACT);
    }
  }

  assertUnverifiedReportClaimNotPublishedFact(status: ReportClaimStatus): void {
    const unverified =
      status === ReportClaimStatus.DRAFT ||
      status === ReportClaimStatus.ASSERTED ||
      status === ReportClaimStatus.UNDER_REVIEW;
    if (unverified) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.UNVERIFIED_CLAIM_NOT_PUBLISHED_FACT);
    }
  }

  assertDegradedDataQualityBlocksClaim(status: MetricDataQualityStatus): void {
    if (
      status === MetricDataQualityStatus.DEGRADED ||
      status === MetricDataQualityStatus.UNRELIABLE ||
      status === MetricDataQualityStatus.REJECTED
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DEGRADED_DATA_QUALITY_BLOCKS_CLAIM);
    }
  }

  assertStaleMetricBlocksConsequentialUse(isStale: boolean, consequential: boolean): void {
    if (isStale && consequential) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.STALE_METRIC_BLOCKS_CONSEQUENTIAL_USE);
    }
  }

  assertBaselineNotCurrentTarget(context?: string): void {
    if (context?.toLowerCase().includes('baseline is current target')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.BASELINE_NOT_CURRENT_TARGET);
    }
  }

  assertCalculationRunFailureSafeHalt(status: MetricCalculationRunStatus): void {
    if (
      status === MetricCalculationRunStatus.FAILED ||
      status === MetricCalculationRunStatus.SAFE_HALTED
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CALCULATION_RUN_FAILURE_SAFE_HALT);
    }
  }

  assertDataQualityNotAssessmentOfLegality(context?: string): void {
    if (context?.toLowerCase().includes('data quality proves legality')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DATA_QUALITY_NOT_ASSESSMENT_OF_LEGALITY);
    }
  }

  assertReportClaimNotVerifiedWithoutReview(status: ReportClaimStatus): void {
    if (status !== ReportClaimStatus.VERIFIED) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.REPORT_CLAIM_NOT_VERIFIED_WITHOUT_REVIEW);
    }
  }

  assertReportPublicationNotDecisionNotice(context?: string): void {
    if (context?.toLowerCase().includes('publication is decision notice')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.REPORT_PUBLICATION_NOT_DECISION_NOTICE);
    }
  }

  assertReportApprovalNotAuthorityAct(context?: string): void {
    if (context?.toLowerCase().includes('report approval is authority act')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.REPORT_APPROVAL_NOT_AUTHORITY_ACT);
    }
  }

  assertHistoricalReplayNotLiveDecision(context?: string): void {
    if (context?.toLowerCase().includes('replay substitutes live decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.HISTORICAL_REPLAY_NOT_LIVE_DECISION);
    }
  }

  assertDecisionTraceNotSubstitutesDecision(context?: string): void {
    if (context?.toLowerCase().includes('trace substitutes decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DECISION_TRACE_NOT_SUBSTITUTES_DECISION);
    }
  }

  assertAccessNotAuthority(context?: string): void {
    if (context?.toLowerCase().includes('access grants authority')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ACCESS_NOT_AUTHORITY);
    }
  }

  assertViewingAnalyticsNotDelegation(context?: string): void {
    if (context?.toLowerCase().includes('viewing analytics grants delegation')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.VIEWING_ANALYTICS_NOT_DELEGATION);
    }
  }

  assertRecommendationNotWaiver(context?: string): void {
    if (context?.toLowerCase().includes('recommendation waives obligation')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.RECOMMENDATION_NOT_WAIVER);
    }
  }

  assertScenarioComparisonNotMandate(context?: string): void {
    if (context?.toLowerCase().includes('scenario comparison is mandate')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SCENARIO_COMPARISON_NOT_MANDATE);
    }
  }

  assertSensitivityAnalysisNotApproval(context?: string): void {
    if (context?.toLowerCase().includes('sensitivity analysis is approval')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SENSITIVITY_ANALYSIS_NOT_APPROVAL);
    }
  }

  assertAiToolEntitlementNotAuthority(context?: string): void {
    if (context?.toLowerCase().includes('tool entitlement grants authority')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_TOOL_ENTITLEMENT_NOT_AUTHORITY);
    }
  }

  assertAiDataEntitlementNotDisclosureRight(context?: string): void {
    if (context?.toLowerCase().includes('data entitlement is disclosure right')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_DATA_ENTITLEMENT_NOT_DISCLOSURE_RIGHT);
    }
  }

  assertHumanDispositionRequiredForConsequentialAi(
    consequential: boolean,
    hasDisposition: boolean,
  ): void {
    if (consequential && !hasDisposition) {
      throw new ForbiddenException(
        INTELLIGENCE_REASON_CODES.HUMAN_DISPOSITION_REQUIRED_FOR_CONSEQUENTIAL_AI,
      );
    }
  }

  assertAiIncidentTriggersSuspensionReview(hasIncident: boolean, hasSuspensionReview: boolean): void {
    if (hasIncident && !hasSuspensionReview) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_INCIDENT_TRIGGERS_SUSPENSION_REVIEW);
    }
  }

  assertEvaluationScoreNotApproval(context?: string): void {
    if (context?.toLowerCase().includes('evaluation score is approval')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.EVALUATION_SCORE_NOT_APPROVAL);
    }
  }

  assertMonitoringRuleNotEnforcementAuthority(context?: string): void {
    if (context?.toLowerCase().includes('monitoring rule enforces')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.MONITORING_RULE_NOT_ENFORCEMENT_AUTHORITY);
    }
  }

  assertRiskLevelNotSanctionLevel(context?: string): void {
    if (context?.toLowerCase().includes('risk level is sanction')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.RISK_LEVEL_NOT_SANCTION_LEVEL);
    }
  }

  assertAnalysisRequestNotDecisionRequest(context?: string): void {
    if (context?.toLowerCase().includes('analysis request is decision request')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ANALYSIS_REQUEST_NOT_DECISION_REQUEST);
    }
  }

  assertCompletedAnalysisNotFinalOrder(context?: string): void {
    if (context?.toLowerCase().includes('completed analysis is final order')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.COMPLETED_ANALYSIS_NOT_FINAL_ORDER);
    }
  }

  assertSafeHaltBlocksConsequentialPath(safeHalted: boolean, consequential: boolean): void {
    if (safeHalted && consequential) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SAFE_HALT_BLOCKS_CONSEQUENTIAL_PATH);
    }
  }

  assertUnresolvedEntitlementBlocksExecution(hasEntitlement: boolean): void {
    if (!hasEntitlement) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.UNRESOLVED_ENTITLEMENT_BLOCKS_EXECUTION);
    }
  }

  assertCaseScopedExecutionOnly(
    executionCaseId: string | null | undefined,
    allowedCaseId: string | null | undefined,
  ): void {
    if (allowedCaseId && executionCaseId && executionCaseId !== allowedCaseId) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CASE_SCOPED_EXECUTION_ONLY);
    }
  }

  assertInstitutionBoundaryOnRetrieval(
    requestInstitutionId: string,
    targetInstitutionId: string,
  ): void {
    if (requestInstitutionId !== targetInstitutionId) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.INSTITUTION_BOUNDARY_ON_RETRIEVAL);
    }
  }

  assertDeterministicAdapterNotDecisionEngine(context?: string): void {
    if (context?.toLowerCase().includes('adapter issues decision')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.DETERMINISTIC_ADAPTER_NOT_DECISION_ENGINE);
    }
  }

  assertPromptGovernanceNotPolicyAuthority(context?: string): void {
    if (context?.toLowerCase().includes('prompt governance sets policy')) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.PROMPT_GOVERNANCE_NOT_POLICY_AUTHORITY);
    }
  }

  assertForecastStalenessRequiresDisclaimer(isStale: boolean, hasDisclaimer: boolean): void {
    if (isStale && !hasDisclaimer) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.FORECAST_STALENESS_REQUIRES_DISCLAIMER);
    }
  }

  assertIndicatorStalenessSafeHalt(isStale: boolean, consequential: boolean): void {
    if (isStale && consequential) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.INDICATOR_STALENESS_SAFE_HALT);
    }
  }

  assertReportGenerationSafeHalt(safeHalted: boolean): void {
    if (safeHalted) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.REPORT_GENERATION_SAFE_HALT);
    }
  }

  assertSimulationRunSafeHalt(safeHalted: boolean): void {
    if (safeHalted) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.SIMULATION_RUN_SAFE_HALT);
    }
  }

  assertAnalysisRunSafeHalt(safeHalted: boolean): void {
    if (safeHalted) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.ANALYSIS_RUN_SAFE_HALT);
    }
  }

  rejectClientPerformanceClaimFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PERFORMANCE_CLAIM_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${INTELLIGENCE_REASON_CODES.PERFORMANCE_CLAIM_CLIENT_STATUS_FORBIDDEN}: client may not set "${field}"`,
        );
      }
    }
  }

  rejectClientMetricFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_METRIC_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${INTELLIGENCE_REASON_CODES.METRIC_CLIENT_COMPUTED_VALUE_FORBIDDEN}: client may not set "${field}"`,
        );
      }
    }
  }

  rejectClientAiExecutionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_AI_EXECUTION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${INTELLIGENCE_REASON_CODES.AI_EXECUTION_CLIENT_DECISION_FIELDS_FORBIDDEN}: client may not set "${field}"`,
        );
      }
    }
  }

  assertIntelligenceLayerBoundaryNonWaivable(waiverRequested: boolean): void {
    if (waiverRequested) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.INTELLIGENCE_LAYER_BOUNDARY_NON_WAIVABLE);
    }
  }

  enforceInvariant(code: IntelligenceInvariantCode, trigger: boolean): void {
    if (!trigger) {
      return;
    }

    const handlers: Record<IntelligenceInvariantCode, () => void> = {
      DASHBOARD_CANNOT_CREATE_AUTHORITY: () => { this.assertDashboardCannotCreateAuthority(true); },
      DASHBOARD_CANNOT_GRANT_DELEGATION: () => { this.assertDashboardCannotGrantDelegation(true); },
      DASHBOARD_VIEW_NOT_AUTHORITY: () => { this.assertDashboardViewNotAuthority('authority granted via dashboard'); },
      INDICATOR_NOT_DECISION: () => { this.assertIndicatorNotDecision('indicator constitutes decision'); },
      EXECUTIVE_DASHBOARD_NOT_COMMAND: () => { this.assertExecutiveDashboardNotCommand('executive command issued'); },
      DEPARTMENTAL_CONSOLE_NOT_DISPOSITION: () => { this.assertDepartmentalConsoleNotDisposition('case disposition recorded'); },
      DASHBOARD_SNAPSHOT_NOT_OFFICIAL_RECORD: () => { this.assertDashboardSnapshotNotOfficialRecord('snapshot is official record'); },
      DASHBOARD_WIDGET_NOT_INSTRUMENT: () => { this.assertDashboardWidgetNotInstrument('widget is official instrument'); },
      DASHBOARD_PROJECTION_NOT_VERIFIED_OUTCOME: () => { this.assertDashboardProjectionNotVerifiedOutcome('projection verified outcome'); },
      STALE_INDICATOR_BLOCK_CONSEQUENTIAL_USE: () => { this.assertStaleIndicatorBlocksConsequentialUse(true, true); },
      AI_CANNOT_APPROVE: () => { this.assertAiCannotApprove('APPROVE'); },
      AI_CANNOT_REFUSE: () => { this.assertAiCannotRefuse('REFUSE'); },
      AI_CANNOT_WAIVE: () => { this.assertAiCannotWaive('WAIVE'); },
      AI_CANNOT_SIGN: () => { this.assertAiCannotSign('SIGN'); },
      AI_CANNOT_ISSUE: () => { this.assertAiCannotIssue('ISSUE'); },
      AI_CANNOT_DECIDE: () => { this.assertAiCannotDecide('DECIDE'); },
      AI_RECOMMENDATION_NOT_DECISION: () => { this.assertAiRecommendationNotDecision('recommendation recorded as decision'); },
      AI_EXECUTION_NOT_BINDING: () => { this.assertAiExecutionNotBinding(false); },
      AI_CANNOT_FINALIZE_GOVERNMENT_ACTION: () => { this.assertAiCannotFinalizeGovernmentAction(true); },
      AI_CANNOT_EXECUTE_ENFORCEMENT: () => { this.assertAiCannotExecuteEnforcement('EXECUTE_ENFORCEMENT'); },
      AI_CANNOT_APPOINT_OFFICEHOLDER: () => { this.assertAiCannotAppointOfficeholder('APPOINT_OFFICEHOLDER'); },
      AI_CANNOT_SUSPEND_AUTHORITY: () => { this.assertAiCannotSuspendAuthority('SUSPEND_AUTHORITY'); },
      AI_CANNOT_REVOKE_INSTRUMENT: () => { this.assertAiCannotRevokeInstrument('REVOKE_INSTRUMENT'); },
      AI_ASSISTANCE_NOT_OFFICIAL_ACTOR: () => { this.assertAiAssistanceNotOfficialActor('AI_ASSISTANCE'); },
      AI_OUTPUT_REQUIRES_HUMAN_DISPOSITION: () => { this.assertAiOutputRequiresHumanDisposition(true, false); },
      ALERT_NOT_VIOLATION: () => { this.assertAlertNotViolation(true); },
      ALERT_CANNOT_SELF_VERIFY: () => { this.assertAlertCannotSelfVerify(true); },
      OPEN_ALERT_NOT_CONFIRMED_BREACH: () => { this.assertOpenAlertNotConfirmedBreach(MonitoringAlertStatus.OPEN, true); },
      MONITORING_OBSERVATION_NOT_VIOLATION: () => { this.assertMonitoringObservationNotViolation(true); },
      ALERT_VERIFICATION_REQUIRED_FOR_VIOLATION: () => { this.assertAlertVerificationRequiredForViolation(false, true); },
      CORRELATION_NOT_CAUSATION: () => { this.assertCorrelationNotCausation('correlation proves causation'); },
      FORECAST_NOT_ACHIEVEMENT: () => { this.assertForecastNotAchievement('forecast achieved'); },
      PROJECTION_NOT_GUARANTEE: () => { this.assertProjectionNotGuarantee('projection guaranteed'); },
      TREND_NOT_POLICY_DIRECTIVE: () => { this.assertTrendNotPolicyDirective('trend is policy directive'); },
      ANALYSIS_OPTION_NOT_DECISION: () => { this.assertAnalysisOptionNotDecision('option selected as decision'); },
      ANALYSIS_FINDING_NOT_FINAL_DETERMINATION: () => { this.assertAnalysisFindingNotFinalDetermination('finding is final determination'); },
      RISK_ASSESSMENT_NOT_SANCTION: () => { this.assertRiskAssessmentNotSanction('risk assessment is sanction'); },
      SPONSOR_REPORT_NOT_VERIFIED_MILESTONE: () => { this.assertSponsorReportNotVerifiedMilestone(StrategicProjectMilestoneStatus.REPORTED); },
      REPORTED_MILESTONE_NOT_COMPLETED: () => { this.assertReportedMilestoneNotCompleted(StrategicProjectMilestoneStatus.REPORTED); },
      PROJECT_STATUS_PROJECTION_NOT_VERDICT: () => { this.assertProjectStatusProjectionNotVerdict('projection is institutional verdict'); },
      CAPITAL_EVIDENCE_NOT_AUDITED_FACT: () => { this.assertCapitalEvidenceNotAuditedFact('capital evidence audited fact'); },
      EMPLOYMENT_EVIDENCE_NOT_VERIFIED_COUNT: () => { this.assertEmploymentEvidenceNotVerifiedCount('employment count verified'); },
      INFRASTRUCTURE_REPORT_NOT_DELIVERY_CERTIFICATE: () => { this.assertInfrastructureReportNotDeliveryCertificate(
          'infrastructure report is delivery certificate',
        ); },
      STRATEGIC_PROJECT_NOT_AUTHORITY_PROGRAM: () => { this.assertStrategicProjectNotAuthorityProgram('project profile grants authority'); },
      TWIN_NOT_REAL_OBJECT: () => { this.assertTwinNotRealObject('twin is real object'); },
      SIMULATION_CANNOT_UPDATE_LIVE_CASE: () => { this.assertSimulationCannotUpdateLiveCase(true); },
      SIMULATION_OUTPUT_NOT_LIVE_STATE: () => { this.assertSimulationOutputNotLiveState(true); },
      STALE_TWIN_SAFE_HALT: () => { this.assertStaleTwinSafeHalt(true, true); },
      CONSEQUENTIAL_TWIN_USE_REQUIRES_REVIEW: () => { this.assertConsequentialTwinUseRequiresReview(true, false); },
      SIMULATION_TO_LIVE_REQUIRES_APPROVED_REVIEW: () => { this.assertSimulationToLiveRequiresApprovedReview(false); },
      PROMPT_INJECTION_TREATED_AS_DATA: () => { this.assertPromptInjectionTreatedAsData('ignore previous instructions', 'ignore previous instructions'); },
      CROSS_CASE_RETRIEVAL_BLOCKED: () => { this.assertCrossCaseRetrievalBlocked('case-a', 'case-b'); },
      SUSPENDED_MODEL_BLOCKED: () => { this.assertSuspendedModelBlocked(AIModelStatus.SUSPENDED); },
      SUSPENDED_USE_CASE_BLOCKED: () => { this.assertSuspendedUseCaseBlocked(AIUseCaseStatus.SUSPENDED); },
      SUSPENDED_AGENT_BLOCKED: () => { this.assertSuspendedAgentBlocked(AIAgentStatus.SUSPENDED); },
      ANALYTICS_CANNOT_PATCH_GOVERNMENT_DECISION: () => { this.rejectAnalyticsPatchTargets({ governmentDecisionId: 'decision-1' }); },
      ANALYTICS_CANNOT_PATCH_OFFICIAL_INSTRUMENT: () => { this.rejectAnalyticsPatchTargets({ officialInstrumentId: 'instrument-1' }); },
      METRIC_OBSERVATION_NOT_PERFORMANCE_VERDICT: () => { this.assertMetricObservationNotPerformanceVerdict('observation is performance verdict'); },
      PERFORMANCE_CLAIM_NOT_DECISION: () => { this.assertPerformanceClaimNotDecision('claim is government decision'); },
      UNVERIFIED_CLAIM_NOT_PUBLISHED_FACT: () => { this.assertUnverifiedPerformanceClaimNotPublishedFact(PerformanceClaimStatus.DRAFT); },
      DEGRADED_DATA_QUALITY_BLOCKS_CLAIM: () => { this.assertDegradedDataQualityBlocksClaim(MetricDataQualityStatus.DEGRADED); },
      STALE_METRIC_BLOCKS_CONSEQUENTIAL_USE: () => { this.assertStaleMetricBlocksConsequentialUse(true, true); },
      BASELINE_NOT_CURRENT_TARGET: () => { this.assertBaselineNotCurrentTarget('baseline is current target'); },
      CALCULATION_RUN_FAILURE_SAFE_HALT: () => { this.assertCalculationRunFailureSafeHalt(MetricCalculationRunStatus.SAFE_HALTED); },
      DATA_QUALITY_NOT_ASSESSMENT_OF_LEGALITY: () => { this.assertDataQualityNotAssessmentOfLegality('data quality proves legality'); },
      REPORT_CLAIM_NOT_VERIFIED_WITHOUT_REVIEW: () => { this.assertReportClaimNotVerifiedWithoutReview(ReportClaimStatus.DRAFT); },
      REPORT_PUBLICATION_NOT_DECISION_NOTICE: () => { this.assertReportPublicationNotDecisionNotice('publication is decision notice'); },
      REPORT_APPROVAL_NOT_AUTHORITY_ACT: () => { this.assertReportApprovalNotAuthorityAct('report approval is authority act'); },
      HISTORICAL_REPLAY_NOT_LIVE_DECISION: () => { this.assertHistoricalReplayNotLiveDecision('replay substitutes live decision'); },
      DECISION_TRACE_NOT_SUBSTITUTES_DECISION: () => { this.assertDecisionTraceNotSubstitutesDecision('trace substitutes decision'); },
      ACCESS_NOT_AUTHORITY: () => { this.assertAccessNotAuthority('access grants authority'); },
      VIEWING_ANALYTICS_NOT_DELEGATION: () => { this.assertViewingAnalyticsNotDelegation('viewing analytics grants delegation'); },
      RECOMMENDATION_NOT_WAIVER: () => { this.assertRecommendationNotWaiver('recommendation waives obligation'); },
      SCENARIO_COMPARISON_NOT_MANDATE: () => { this.assertScenarioComparisonNotMandate('scenario comparison is mandate'); },
      SENSITIVITY_ANALYSIS_NOT_APPROVAL: () => { this.assertSensitivityAnalysisNotApproval('sensitivity analysis is approval'); },
      AI_TOOL_ENTITLEMENT_NOT_AUTHORITY: () => { this.assertAiToolEntitlementNotAuthority('tool entitlement grants authority'); },
      AI_DATA_ENTITLEMENT_NOT_DISCLOSURE_RIGHT: () => { this.assertAiDataEntitlementNotDisclosureRight('data entitlement is disclosure right'); },
      HUMAN_DISPOSITION_REQUIRED_FOR_CONSEQUENTIAL_AI: () => { this.assertHumanDispositionRequiredForConsequentialAi(true, false); },
      AI_INCIDENT_TRIGGERS_SUSPENSION_REVIEW: () => { this.assertAiIncidentTriggersSuspensionReview(true, false); },
      EVALUATION_SCORE_NOT_APPROVAL: () => { this.assertEvaluationScoreNotApproval('evaluation score is approval'); },
      MONITORING_RULE_NOT_ENFORCEMENT_AUTHORITY: () => { this.assertMonitoringRuleNotEnforcementAuthority('monitoring rule enforces'); },
      RISK_LEVEL_NOT_SANCTION_LEVEL: () => { this.assertRiskLevelNotSanctionLevel('risk level is sanction'); },
      ANALYSIS_REQUEST_NOT_DECISION_REQUEST: () => { this.assertAnalysisRequestNotDecisionRequest('analysis request is decision request'); },
      COMPLETED_ANALYSIS_NOT_FINAL_ORDER: () => { this.assertCompletedAnalysisNotFinalOrder('completed analysis is final order'); },
      SAFE_HALT_BLOCKS_CONSEQUENTIAL_PATH: () => { this.assertSafeHaltBlocksConsequentialPath(true, true); },
      UNRESOLVED_ENTITLEMENT_BLOCKS_EXECUTION: () => { this.assertUnresolvedEntitlementBlocksExecution(false); },
      CASE_SCOPED_EXECUTION_ONLY: () => { this.assertCaseScopedExecutionOnly('case-a', 'case-b'); },
      INSTITUTION_BOUNDARY_ON_RETRIEVAL: () => { this.assertInstitutionBoundaryOnRetrieval('inst-a', 'inst-b'); },
      DETERMINISTIC_ADAPTER_NOT_DECISION_ENGINE: () => { this.assertDeterministicAdapterNotDecisionEngine('adapter issues decision'); },
      PROMPT_GOVERNANCE_NOT_POLICY_AUTHORITY: () => { this.assertPromptGovernanceNotPolicyAuthority('prompt governance sets policy'); },
      FORECAST_STALENESS_REQUIRES_DISCLAIMER: () => { this.assertForecastStalenessRequiresDisclaimer(true, false); },
      INDICATOR_STALENESS_SAFE_HALT: () => { this.assertIndicatorStalenessSafeHalt(true, true); },
      REPORT_GENERATION_SAFE_HALT: () => { this.assertReportGenerationSafeHalt(true); },
      SIMULATION_RUN_SAFE_HALT: () => { this.assertSimulationRunSafeHalt(true); },
      ANALYSIS_RUN_SAFE_HALT: () => { this.assertAnalysisRunSafeHalt(true); },
      PERFORMANCE_CLAIM_CLIENT_STATUS_FORBIDDEN: () => { this.rejectClientPerformanceClaimFields({ status: PerformanceClaimStatus.VERIFIED }); },
      DASHBOARD_CLIENT_AUTHORITY_FIELDS_FORBIDDEN: () => { this.rejectDashboardAuthorityFields({ authorityGranted: true }); },
      METRIC_CLIENT_COMPUTED_VALUE_FORBIDDEN: () => { this.rejectClientMetricFields({ observedValue: 100 }); },
      AI_EXECUTION_CLIENT_DECISION_FIELDS_FORBIDDEN: () => { this.rejectClientAiExecutionFields({ approved: true }); },
      INTELLIGENCE_LAYER_BOUNDARY_NON_WAIVABLE: () => { this.assertIntelligenceLayerBoundaryNonWaivable(true); },
    };

    handlers[code]();
  }

  listInvariantCodes(): readonly IntelligenceInvariantCode[] {
    return MUST_FAIL_INVARIANTS;
  }
}
