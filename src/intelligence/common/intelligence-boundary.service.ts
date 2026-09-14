import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ConsequentialUseReviewDecision,
  DigitalTwinMode,
  DigitalTwinType,
  IdentityType,
  RiskEvidenceBasis,
} from '@prisma/client';

import {
  AI_ACTOR_IDENTITY_PREFIX,
  AI_ACTOR_ROLE_MARKER,
  AI_CANNOT_IMPOSE_ENFORCEMENT_MESSAGE,
  AI_CANNOT_SELF_VERIFY_ALERT_MESSAGE,
  ALERT_GENERATED_NOT_VERIFIED_MESSAGE,
  ALERT_NOT_EMERGENCY_MESSAGE,
  ALERT_NOT_VIOLATION_MESSAGE,
  ANALYSIS_NOT_DECISION_MESSAGE,
  FORBIDDEN_AI_TWIN_FINAL_ACTIONS,
  FORBIDDEN_CLIENT_TWIN_FIELDS,
  FORBIDDEN_MONITORING_SUBJECT_TYPES,
  FORBIDDEN_SIMULATION_LIVE_ACTIONS,
  FORBIDDEN_SIMULATION_LIVE_MUTATIONS,
  INTELLIGENCE_REASON_CODES,
  MODEL_ESTIMATE_LABEL_REQUIRED_MESSAGE,
  MONITORING_SOURCE_NOT_APPROVED_MESSAGE,
  RISK_SCORE_CANNOT_BYPASS_GATE_MESSAGE,
  RISK_SCORE_NOT_AUTHORITY_MESSAGE,
  SOURCE_CONFLICT_PRESERVATION_MESSAGE,
  UNAUTHORIZED_PERSONAL_MONITORING_MESSAGE,
} from '../intelligence.constants';

export interface TwinIntegrityState {
  isStale: boolean;
  isIncomplete: boolean;
  isInconsistent: boolean;
  isCompromised: boolean;
  outsideApprovedUse: boolean;
  isAuthoritativeRecord: boolean;
}

export interface TwinSourceDisclosureState {
  sources: { isDisclosed: boolean; sourceStatus: string }[];
}

export interface MonitoringPrivacyInput {
  subjectType?: string;
  institutionalPurpose?: string;
  lawfulBasis?: string;
  accessApprovalRef?: string;
  proportionateSafeguards?: string;
}

export interface ConflictingSourceInput {
  conflictGroupId: string;
  exactValue: unknown;
  sourceReference: string;
}

@Injectable()
export class IntelligenceBoundaryService {
  assertTwinIsNotAuthoritativeRecord(twin: { isAuthoritativeRecord: boolean }): void {
    if (twin.isAuthoritativeRecord) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TWIN_NOT_AUTHORITATIVE);
    }
  }

  assertTwinOwnerIsNotSelf(ownerId: string, representedSubjectId: string): void {
    if (ownerId === representedSubjectId) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TWIN_CANNOT_OWN_ITSELF);
    }
  }

  assertCaseTwinPreventsProfileExpansion(
    representedSubjectType: DigitalTwinType,
    preventsPersonalProfileExpansion: boolean,
  ): void {
    if (
      (representedSubjectType === DigitalTwinType.CASE ||
        representedSubjectType === DigitalTwinType.APPLICATION) &&
      !preventsPersonalProfileExpansion
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.CASE_TWIN_PROFILE_EXPANSION);
    }
  }

  assertModeIsNotOperationalControl(mode: DigitalTwinMode, isOperationalControl = false): void {
    if (isOperationalControl) {
      throw new ForbiddenException(
        mode === DigitalTwinMode.APPROVED_LIVE_REFERENCE
          ? 'APPROVED_LIVE_REFERENCE is not operational control authority'
          : INTELLIGENCE_REASON_CODES.OPERATIONAL_CONTROL_FORBIDDEN,
      );
    }
  }

  assertRelationshipIsModeledOnly(isModeledOnly: boolean): void {
    if (!isModeledOnly) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.MODELED_NOT_OBSERVED);
    }
  }

  assertScenarioNotPrediction(isPrediction: boolean): void {
    if (isPrediction) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SCENARIO_NOT_PREDICTION);
    }
  }

  assertOutputNotPresentedAsPrediction(presentedAsPrediction: boolean): void {
    if (presentedAsPrediction) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SCENARIO_NOT_PREDICTION);
    }
  }

  assertSimulationCannotMutateLive(target: string): void {
    if (
      FORBIDDEN_SIMULATION_LIVE_MUTATIONS.includes(
        target as (typeof FORBIDDEN_SIMULATION_LIVE_MUTATIONS)[number],
      )
    ) {
      throw new ForbiddenException(
        `${INTELLIGENCE_REASON_CODES.SIMULATION_CANNOT_MUTATE_LIVE}: ${target}`,
      );
    }
  }

  assertSimulationActionForbidden(action: string): void {
    if (
      FORBIDDEN_SIMULATION_LIVE_ACTIONS.includes(
        action as (typeof FORBIDDEN_SIMULATION_LIVE_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(
        `${INTELLIGENCE_REASON_CODES.SIMULATION_CANNOT_MUTATE_LIVE}: ${action}`,
      );
    }
  }

  assertTwinIntegrityForConsequentialUse(twin: TwinIntegrityState): void {
    if (twin.isAuthoritativeRecord) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.TWIN_NOT_AUTHORITATIVE);
    }

    if (
      twin.isStale ||
      twin.isIncomplete ||
      twin.isInconsistent ||
      twin.isCompromised ||
      twin.outsideApprovedUse
    ) {
      throw new ForbiddenException(
        twin.isStale
          ? INTELLIGENCE_REASON_CODES.STALE_TWIN_BLOCKS_USE
          : INTELLIGENCE_REASON_CODES.INCOMPLETE_TWIN_BLOCKS_USE,
      );
    }
  }

  assertSourcesDisclosedForConsequentialUse(state: TwinSourceDisclosureState): void {
    const undisclosed = state.sources.filter((source) => !source.isDisclosed);

    if (undisclosed.length > 0) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.MISSING_SOURCE_UNDISCLOSED);
    }
  }

  assertHumanReviewerForConsequentialUse(
    actorIdentityType: IdentityType,
    actorRoleMarker?: string,
  ): void {
    if (actorIdentityType === IdentityType.SERVICE || actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_FINAL_DECIDE);
    }
  }

  assertAiCannotFinalDecide(action: string, isAiActor: boolean): void {
    if (
      isAiActor &&
      FORBIDDEN_AI_TWIN_FINAL_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_TWIN_FINAL_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_FINAL_DECIDE);
    }
  }

  assertConsequentialReviewApproved(decision: ConsequentialUseReviewDecision): void {
    if (
      decision !== ConsequentialUseReviewDecision.APPROVED &&
      decision !== ConsequentialUseReviewDecision.CONDITIONAL
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CONSEQUENTIAL_REVIEW_REQUIRED);
    }
  }

  assertSnapshotImmutable(isImmutable: boolean): void {
    if (!isImmutable) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SNAPSHOT_IMMUTABLE);
    }
  }

  assertLiveTransitionRequiresAcceptance(input: {
    institutionalAcceptanceReference: string;
    rollbackPlanReference: string;
    securityReviewCompleted: boolean;
    testingCompleted: boolean;
    trainingCompleted: boolean;
    liveActivationAuthorized: boolean;
    technicalSuccessAcknowledged: boolean;
  }): void {
    if (!input.rollbackPlanReference.trim()) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.ROLLBACK_REQUIRED);
    }

    if (!input.institutionalAcceptanceReference.trim()) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.LIVE_TRANSITION_REQUIRES_ACCEPTANCE);
    }

    if (
      input.technicalSuccessAcknowledged &&
      !input.liveActivationAuthorized &&
      !input.securityReviewCompleted
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TECHNICAL_SUCCESS_NOT_ACTIVATION);
    }

    if (
      input.liveActivationAuthorized &&
      (!input.testingCompleted || !input.securityReviewCompleted || !input.trainingCompleted)
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.LIVE_TRANSITION_REQUIRES_ACCEPTANCE);
    }
  }

  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_TWIN_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set protected field "${field}"`);
      }
    }
  }

  assertAnalysisNotDecision(input: { isDecisionLike?: boolean; presentationText?: string }): void {
    if (input.isDecisionLike) {
      throw new BadRequestException(ANALYSIS_NOT_DECISION_MESSAGE);
    }

    const text = (input.presentationText ?? '').toLowerCase();
    const forbiddenPhrases = [
      'final decision',
      'government determination',
      'legal advice',
      'professional certification',
    ];
    for (const phrase of forbiddenPhrases) {
      if (text.includes(phrase)) {
        throw new BadRequestException(ANALYSIS_NOT_DECISION_MESSAGE);
      }
    }
  }

  assertAlertNotViolationOrEmergency(input: {
    isViolation?: boolean;
    isEmergency?: boolean;
    isEnforcement?: boolean;
  }): void {
    if (input.isViolation) {
      throw new BadRequestException(ALERT_NOT_VIOLATION_MESSAGE);
    }
    if (input.isEmergency) {
      throw new BadRequestException(ALERT_NOT_EMERGENCY_MESSAGE);
    }
    if (input.isEnforcement) {
      throw new BadRequestException(AI_CANNOT_IMPOSE_ENFORCEMENT_MESSAGE);
    }
  }

  assertGeneratedAlertNotVerifiedEvent(status: string): void {
    if (status === 'VERIFIED_EVENT') {
      throw new BadRequestException(ALERT_GENERATED_NOT_VERIFIED_MESSAGE);
    }
  }

  assertAiCannotSelfVerify(input: {
    actorRoleMarker?: string;
    verifierIdentityId?: string;
    isAlgorithmic?: boolean;
  }): void {
    if (input.isAlgorithmic) {
      throw new ForbiddenException(AI_CANNOT_SELF_VERIFY_ALERT_MESSAGE);
    }
    if (input.actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(AI_CANNOT_SELF_VERIFY_ALERT_MESSAGE);
    }
    if (input.verifierIdentityId?.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException(AI_CANNOT_SELF_VERIFY_ALERT_MESSAGE);
    }
  }

  assertAiCannotImposeEnforcement(actorRoleMarker?: string): void {
    if (actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(AI_CANNOT_IMPOSE_ENFORCEMENT_MESSAGE);
    }
  }

  assertRiskScoreNotAuthority(input: { claimsAuthority?: boolean }): void {
    if (input.claimsAuthority) {
      throw new BadRequestException(RISK_SCORE_NOT_AUTHORITY_MESSAGE);
    }
  }

  assertRiskScoreCannotBypassGate(input: { scoreIsMandatoryGateBypass?: boolean }): void {
    if (input.scoreIsMandatoryGateBypass) {
      throw new BadRequestException(RISK_SCORE_CANNOT_BYPASS_GATE_MESSAGE);
    }
  }

  assertModelEstimateLabeled(basis: RiskEvidenceBasis, basisLabel?: string): void {
    if (basis === RiskEvidenceBasis.MODEL_ESTIMATE) {
      const label = basisLabel ?? '';
      if (!label.includes('MODEL_ESTIMATE')) {
        throw new BadRequestException(MODEL_ESTIMATE_LABEL_REQUIRED_MESSAGE);
      }
    }
  }

  assertSourceConflictsPreserved(sources: ConflictingSourceInput[]): void {
    const groups = new Map<string, ConflictingSourceInput[]>();
    for (const source of sources) {
      if (!source.conflictGroupId) {
        continue;
      }
      const existing = groups.get(source.conflictGroupId) ?? [];
      existing.push(source);
      groups.set(source.conflictGroupId, existing);
    }

    for (const [, group] of groups) {
      if (group.length < 2) {
        continue;
      }
      const values = group.map((s) => JSON.stringify(s.exactValue));
      const uniqueValues = new Set(values);
      if (uniqueValues.size < 2) {
        throw new BadRequestException(SOURCE_CONFLICT_PRESERVATION_MESSAGE);
      }
    }
  }

  rejectAveragedConflictResolution(resolutionMethod?: string): void {
    if (resolutionMethod?.toLowerCase().includes('average')) {
      throw new BadRequestException(SOURCE_CONFLICT_PRESERVATION_MESSAGE);
    }
  }

  assertMonitoringPrivacyAuthorized(input: MonitoringPrivacyInput): void {
    const subject = input.subjectType ?? '';
    if (
      !FORBIDDEN_MONITORING_SUBJECT_TYPES.includes(
        subject as (typeof FORBIDDEN_MONITORING_SUBJECT_TYPES)[number],
      )
    ) {
      return;
    }

    const hasPurpose = Boolean(input.institutionalPurpose?.trim());
    const hasLawfulBasis = Boolean(input.lawfulBasis?.trim());
    const hasAccessApproval = Boolean(input.accessApprovalRef?.trim());
    const hasSafeguards = Boolean(input.proportionateSafeguards?.trim());

    if (!hasPurpose || !hasLawfulBasis || !hasAccessApproval || !hasSafeguards) {
      throw new ForbiddenException(UNAUTHORIZED_PERSONAL_MONITORING_MESSAGE);
    }
  }

  assertMonitoringSourceApproved(input: {
    observationSourceReference: string;
    approvedSourceReference: string;
  }): void {
    if (input.observationSourceReference !== input.approvedSourceReference) {
      throw new BadRequestException(MONITORING_SOURCE_NOT_APPROVED_MESSAGE);
    }
  }

  assertHumanReviewerPresent(reviewerIdentityId?: string): void {
    if (!reviewerIdentityId?.trim()) {
      throw new BadRequestException('Human reviewer identity is required for attributable review');
    }
    if (reviewerIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI actors cannot satisfy human review requirements');
    }
  }

  assertVerificationRequiredForConsequential(
    isConsequential: boolean,
    verifierIdentityId?: string,
  ): void {
    if (isConsequential) {
      this.assertHumanReviewerPresent(verifierIdentityId);
    }
  }
}
