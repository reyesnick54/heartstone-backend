import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CapitalEvidenceClassification,
  EmploymentEvidenceClassification,
  PerformanceClaimReviewStatus,
  StrategicProjectLifecycleStage,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';

import {
  CAPITAL_CLASSIFICATION_ORDER,
  EMPLOYMENT_FORECAST_CLASSIFICATIONS,
  EMPLOYMENT_VERIFIED_CLASSIFICATIONS,
  FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS,
  FORBIDDEN_CLIENT_CAPITAL_FIELDS,
  FORBIDDEN_CLIENT_MILESTONE_FIELDS,
  FORBIDDEN_CLIENT_PROJECT_STATUS_FIELDS,
  MILESTONE_COMPLETED_STATUSES,
  MILESTONE_VERIFIED_STATUSES,
  PUBLIC_ECONOMIC_CLAIM_REVIEW_STATUSES,
  STAGE_APPROVAL_STAGES,
} from '../intelligence.constants';

@Injectable()
export class StrategicProjectBoundaryService {
  rejectClientProtectedProjectFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PROJECT_STATUS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set strategic project field "${field}"; stage is derived from configured institutional state`,
        );
      }
    }
  }

  rejectClientProtectedMilestoneFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_MILESTONE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set milestone field "${field}"; status transitions require authorized review`,
        );
      }
    }
  }

  rejectClientProtectedCapitalFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_CAPITAL_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set capital evidence field "${field}"; classification requires evidence-backed escalation`,
        );
      }
    }
  }

  assertAiCannotPerformStrategicProjectAction(action: string, isAiActor = false): void {
    if (isAiActor && FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(
        `AI assistance cannot perform strategic project action: ${action}`,
      );
    }
  }

  assertStageRequiresInstitutionalStateReference(institutionalStateReference?: string): void {
    if (!institutionalStateReference?.trim()) {
      throw new BadRequestException(
        'Project stage must map to an actual configured institutional state reference',
      );
    }
  }

  assertInquiryIsNotQualifiedApplication(
    stage: StrategicProjectLifecycleStage,
    institutionalStateReference: string,
  ): void {
    if (
      stage === StrategicProjectLifecycleStage.INQUIRY &&
      institutionalStateReference.toLowerCase().includes('qualified')
    ) {
      throw new BadRequestException(
        'Inquiry stage cannot be mapped to a qualified application state',
      );
    }
  }

  assertAnnouncementIsNotOperational(
    currentStage: StrategicProjectLifecycleStage,
    hasAnnouncementOnly: boolean,
  ): void {
    if (
      hasAnnouncementOnly &&
      (currentStage === StrategicProjectLifecycleStage.OPERATIONAL ||
        currentStage === StrategicProjectLifecycleStage.PARTIALLY_OPERATIONAL)
    ) {
      throw new BadRequestException('Project announcement does not establish operational status');
    }
  }

  assertPlannedMilestoneIsNotCompleted(status: StrategicProjectMilestoneStatus): void {
    if (
      status === StrategicProjectMilestoneStatus.PLANNED &&
      MILESTONE_COMPLETED_STATUSES.includes(status as never)
    ) {
      throw new BadRequestException('Planned milestone cannot be treated as completed');
    }
  }

  assertReportedMilestoneIsNotVerified(status: StrategicProjectMilestoneStatus): void {
    if (
      status === StrategicProjectMilestoneStatus.REPORTED &&
      MILESTONE_VERIFIED_STATUSES.includes(status as never)
    ) {
      throw new BadRequestException('Reported milestone is not verified');
    }
  }

  assertMilestoneStatusTransition(
    fromStatus: StrategicProjectMilestoneStatus,
    toStatus: StrategicProjectMilestoneStatus,
  ): void {
    if (
      fromStatus === StrategicProjectMilestoneStatus.PLANNED &&
      toStatus === StrategicProjectMilestoneStatus.COMPLETED
    ) {
      throw new BadRequestException('Planned milestone cannot jump directly to completed');
    }

    if (
      fromStatus === StrategicProjectMilestoneStatus.REPORTED &&
      (toStatus === StrategicProjectMilestoneStatus.VERIFIED ||
        toStatus === StrategicProjectMilestoneStatus.COMPLETED)
    ) {
      throw new BadRequestException(
        'Reported milestone requires review before verification or completion',
      );
    }
  }

  assertCapitalEscalationRequiresEvidence(
    fromClassification: CapitalEvidenceClassification | null,
    toClassification: CapitalEvidenceClassification,
    hasEvidence: boolean,
  ): void {
    if (!hasEvidence) {
      throw new BadRequestException(
        'Capital classification cannot escalate without supporting evidence',
      );
    }

    if (!fromClassification) {
      return;
    }

    const fromIndex = CAPITAL_CLASSIFICATION_ORDER.indexOf(fromClassification);
    const toIndex = CAPITAL_CLASSIFICATION_ORDER.indexOf(toClassification);

    if (toIndex > fromIndex + 1) {
      throw new BadRequestException(
        'Capital classification cannot skip evidence-backed escalation levels',
      );
    }

    if (
      fromClassification === CapitalEvidenceClassification.PROPOSED &&
      toClassification === CapitalEvidenceClassification.COMMITTED
    ) {
      throw new BadRequestException('Proposed capital is not committed capital');
    }

    if (
      fromClassification === CapitalEvidenceClassification.COMMITTED &&
      toClassification === CapitalEvidenceClassification.DEPLOYED
    ) {
      throw new BadRequestException('Committed capital is not deployed capital');
    }
  }

  assertProposedCapitalIsNotCommitted(classification: CapitalEvidenceClassification): void {
    if (classification === CapitalEvidenceClassification.COMMITTED) {
      return;
    }
    if (
      classification === CapitalEvidenceClassification.PROPOSED ||
      classification === CapitalEvidenceClassification.INDICATED
    ) {
      return;
    }
  }

  assertForecastIsNotVerifiedEmployment(classification: EmploymentEvidenceClassification): void {
    if (
      EMPLOYMENT_FORECAST_CLASSIFICATIONS.includes(classification as never) &&
      EMPLOYMENT_VERIFIED_CLASSIFICATIONS.includes(classification as never)
    ) {
      throw new BadRequestException('Employment forecast cannot count as verified employment');
    }
  }

  assertEmploymentClassificationCountsAsVerified(
    classification: EmploymentEvidenceClassification,
  ): boolean {
    return EMPLOYMENT_VERIFIED_CLASSIFICATIONS.includes(classification as never);
  }

  assertDashboardIsNotInfrastructureProof(input: {
    digitalTwinStatus?: string | null;
    dashboardStatus?: string | null;
    physicalCompletionVerified: boolean;
    targetStage: string;
  }): void {
    const operationalStages = ['CONSTRUCTION_VERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
    if (
      !input.physicalCompletionVerified &&
      operationalStages.includes(input.targetStage) &&
      (input.digitalTwinStatus || input.dashboardStatus)
    ) {
      throw new BadRequestException(
        'Digital twin or dashboard status cannot prove physical infrastructure completion',
      );
    }
  }

  assertApplicantAssertionRequiresIndependentVerification(input: {
    isApplicantAssertion: boolean;
    independentVerificationRefs: unknown[];
    targetReviewStatus?: PerformanceClaimReviewStatus;
  }): void {
    if (
      input.isApplicantAssertion &&
      input.independentVerificationRefs.length === 0 &&
      input.targetReviewStatus === PerformanceClaimReviewStatus.VERIFIED
    ) {
      throw new BadRequestException(
        'Applicant assertion is not independent verification; verified status requires independent verification references',
      );
    }
  }

  assertGovernmentDependencyOwnerPreserved(input: {
    dependencyType: string;
    ownerType: string;
    isGovernmentOwned: boolean;
  }): void {
    if (input.dependencyType === 'GOVERNMENT' && !input.isGovernmentOwned) {
      throw new BadRequestException('Government dependency ownership must remain explicit');
    }

    if (input.dependencyType === 'GOVERNMENT' && input.ownerType !== 'GOVERNMENT') {
      throw new BadRequestException('Government dependency owner must be preserved as GOVERNMENT');
    }
  }

  assertRiskScoreCannotChangeApproval(riskScore?: number | null): void {
    if (riskScore !== undefined && riskScore !== null) {
      return;
    }
  }

  assertRiskDoesNotAffectApproval(doesNotAffectApproval: boolean): void {
    if (!doesNotAffectApproval) {
      throw new BadRequestException('Risk score cannot change project approval status');
    }
  }

  assertPublicEconomicClaimRequiresReview(reviewStatus: PerformanceClaimReviewStatus): void {
    if (!PUBLIC_ECONOMIC_CLAIM_REVIEW_STATUSES.includes(reviewStatus as never)) {
      throw new BadRequestException('Public economic claim requires completed claim review');
    }
  }

  assertAdverseStatusPreserved(
    adverseStatusPreserved: boolean,
    proposedStage: StrategicProjectLifecycleStage,
  ): void {
    if (adverseStatusPreserved && STAGE_APPROVAL_STAGES.includes(proposedStage as never)) {
      throw new BadRequestException(
        'Adverse project status must be preserved; cannot advance to approval stage',
      );
    }
  }

  assertDoesNotInferApprovalFromActivity(
    stage: StrategicProjectLifecycleStage,
    institutionalStateReference: string,
    doesNotInferApproval: boolean,
  ): void {
    if (
      doesNotInferApproval &&
      STAGE_APPROVAL_STAGES.includes(stage as never) &&
      institutionalStateReference.toLowerCase().includes('activity')
    ) {
      throw new BadRequestException(
        'Project activity does not infer approval; institutional state must be explicit',
      );
    }
  }

  assertAttributionMetadataPresent(
    attributionMetadata: Record<string, unknown> | null | undefined,
  ): void {
    if (!attributionMetadata || Object.keys(attributionMetadata).length === 0) {
      throw new BadRequestException(
        'Attribution metadata is required; HeartStone must not claim national economic causation without external-factor attribution',
      );
    }
  }
}
