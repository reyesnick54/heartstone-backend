import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ComplaintAssignmentStatus,
  ComplaintFindingStatus,
  ComplaintPathwayActor,
  ComplaintRemedyType,
  ComplaintStatus,
  GovernmentDecisionStatus,
  SubstantiveAppealStatus,
} from '@prisma/client';

import {
  ACTIVE_COMPLAINT_STATUSES,
  FORBIDDEN_CLIENT_COMPLAINT_FIELDS,
  OPEN_SUBSTANTIVE_APPEAL_STATUSES,
  RESTRICTED_EVIDENCE_ACCESS_LEVELS,
} from '../redress.constants';

@Injectable()
export class ComplaintBoundaryService {
  rejectClientProtectedComplaintFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_COMPLAINT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a complaint record`);
      }
    }
  }

  assertClassificationIsNotFactualFinding(isFactualFinding: boolean): void {
    if (isFactualFinding) {
      throw new BadRequestException(
        'Complaint classification is not a factual finding; isFactualFinding must remain false',
      );
    }
  }

  assertComplaintDistinctFromAppeal(pathway: 'COMPLAINT' | 'APPEAL'): void {
    if (pathway !== 'COMPLAINT') {
      throw new BadRequestException('This workflow handles complaints, not substantive appeal adjudication');
    }
  }

  assertComplaintNotAutoDismissedBecauseAppealOpen(input: {
    complaintStatus: ComplaintStatus;
    relatedAppealStatus?: SubstantiveAppealStatus | null;
  }): void {
    if (
      input.relatedAppealStatus &&
      OPEN_SUBSTANTIVE_APPEAL_STATUSES.includes(input.relatedAppealStatus as never) &&
      input.complaintStatus === ComplaintStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Complaint must not be auto-closed solely because a substantive appeal is open',
      );
    }
  }

  assertComplaintRemainsActiveWhenAppealOpen(input: {
    complaintStatus: ComplaintStatus;
    relatedAppealStatus?: SubstantiveAppealStatus | null;
    autoDismissAttempt?: boolean;
  }): void {
    if (
      input.autoDismissAttempt &&
      input.relatedAppealStatus &&
      OPEN_SUBSTANTIVE_APPEAL_STATUSES.includes(input.relatedAppealStatus as never)
    ) {
      throw new BadRequestException(
        'An open substantive appeal does not dismiss or close the complaint pathway',
      );
    }

    if (
      input.relatedAppealStatus &&
      OPEN_SUBSTANTIVE_APPEAL_STATUSES.includes(input.relatedAppealStatus as never) &&
      !ACTIVE_COMPLAINT_STATUSES.includes(input.complaintStatus as never) &&
      input.complaintStatus !== ComplaintStatus.CLOSED
    ) {
      return;
    }
  }

  assertAssignmentDoesNotCreateDecisionAuthority(doesNotAlterDecisionAuthority: boolean): void {
    if (!doesNotAlterDecisionAuthority) {
      throw new ForbiddenException(
        'Complaint handler assignment does not create authority to alter the original substantive decision',
      );
    }
  }

  assertConflictedHandlerBlocked(input: {
    conflictCheckPassed: boolean;
    priorInvolvementDeclared: boolean;
    status: ComplaintAssignmentStatus;
  }): void {
    if (!input.conflictCheckPassed || input.priorInvolvementDeclared) {
      if (input.status === ComplaintAssignmentStatus.ACTIVE) {
        throw new ForbiddenException('Conflicted or previously involved handler may not be actively assigned');
      }
    }
  }

  assertIndependenceRequirement(input: {
    independenceRequired: boolean;
    independenceSatisfied: boolean;
    status: ComplaintAssignmentStatus;
  }): void {
    if (input.independenceRequired && !input.independenceSatisfied) {
      if (input.status === ComplaintAssignmentStatus.ACTIVE) {
        throw new ForbiddenException('Independent handler requirement is not satisfied');
      }
    }
  }

  assertRemedyDoesNotSilentlyReverseDecision(input: {
    remedyType: ComplaintRemedyType;
    mayReverseFinalDecision: boolean;
    decisionStatus?: GovernmentDecisionStatus | null;
    authorizedSubstantiveReviewOnly: boolean;
  }): void {
    if (input.mayReverseFinalDecision) {
      throw new ForbiddenException(
        'Complaint remedy must not silently reverse a final GovernmentDecision',
      );
    }

    if (
      input.remedyType === ComplaintRemedyType.RECOMMENDATION_FOR_RECONSIDERATION &&
      !input.authorizedSubstantiveReviewOnly
    ) {
      throw new BadRequestException(
        'Recommendation for reconsideration must route through authorized substantive review',
      );
    }

    if (
      input.decisionStatus === GovernmentDecisionStatus.FINALIZED &&
      input.remedyType === ComplaintRemedyType.RECOMMENDATION_FOR_RECONSIDERATION &&
      !input.authorizedSubstantiveReviewOnly
    ) {
      throw new ForbiddenException(
        'Final decision reversal requires authorized substantive review route, not complaint workflow alone',
      );
    }
  }

  assertAiCannotFinalizeComplaint(actor: ComplaintPathwayActor, targetStatus?: ComplaintFindingStatus): void {
    if (actor === ComplaintPathwayActor.AI_ASSISTANCE) {
      if (targetStatus === ComplaintFindingStatus.FINALIZED) {
        throw new ForbiddenException('AI assistance may summarize but cannot finalize complaint findings');
      }
      throw new ForbiddenException('AI assistance cannot finalize complaint outcomes');
    }
  }

  assertAuthorizedReviewerFinalizesFinding(input: {
    actor: ComplaintPathwayActor;
    consequential: boolean;
    targetStatus: ComplaintFindingStatus;
    reviewerIdentityId?: string | null;
  }): void {
    if (input.targetStatus !== ComplaintFindingStatus.FINALIZED) {
      return;
    }

    this.assertAiCannotFinalizeComplaint(input.actor, input.targetStatus);

    if (input.consequential && input.actor !== ComplaintPathwayActor.REVIEWER) {
      throw new ForbiddenException('Only an authorized reviewer can finalize consequential complaint findings');
    }

    if (input.consequential && !input.reviewerIdentityId) {
      throw new BadRequestException('Consequential complaint finding must remain attributable to a reviewer');
    }
  }

  assertFindingIsNotAppealOutcome(isSubstantiveAppealOutcome: boolean): void {
    if (isSubstantiveAppealOutcome) {
      throw new BadRequestException('Complaint finding is not a substantive appeal outcome');
    }
  }

  assertRetaliationPreservedSeparately(affectsRiskScore: boolean): void {
    if (affectsRiskScore) {
      throw new ForbiddenException(
        'Retaliation allegations must not convert complaint history into negative applicant risk score',
      );
    }
  }

  assertRestrictedInvestigationMaterialNotPublic(input: {
    accessLevel: string;
    exposePrivilegedNotes: boolean;
  }): void {
    if (
      input.exposePrivilegedNotes &&
      RESTRICTED_EVIDENCE_ACCESS_LEVELS.includes(input.accessLevel as never)
    ) {
      throw new ForbiddenException('Privileged investigation material must not be publicly exposed');
    }
  }

  assertClosurePreservesEvidence(evidencePreserved: boolean, decisionHistoryPreserved: boolean): void {
    if (!evidencePreserved || !decisionHistoryPreserved) {
      throw new BadRequestException(
        'Complaint closure must preserve evidence and substantive decision history',
      );
    }
  }

  assertWhistleblowerStatusNotClaimed(notes?: string | null): void {
    if (notes?.toLowerCase().includes('legal whistleblower status')) {
      throw new BadRequestException(
        'Do not claim legal whistleblower status unless separately configured',
      );
    }
  }
}
