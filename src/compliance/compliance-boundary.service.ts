import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ComplianceObservationClassification,
  ComplianceReviewOutcome,
  OfficialInstrumentStatus,
} from '@prisma/client';

import {
  COMPLIANCE_EXPLANATION_CODES,
  FORBIDDEN_CLIENT_COMPLIANCE_FIELDS,
} from './compliance.constants';

@Injectable()
export class ComplianceBoundaryService {
  assertClientPayloadDoesNotSetProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_COMPLIANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException({
          message: `Client cannot set protected compliance field: ${field}`,
          code: COMPLIANCE_EXPLANATION_CODES.CLIENT_CANNOT_SET_OBLIGATION_SATISFIED,
        });
      }
    }
  }

  assertSubmissionIsNotObligation(input: { treatingSubmissionAsObligation: boolean }): void {
    if (input.treatingSubmissionAsObligation) {
      throw new BadRequestException({
        message: 'Compliance submission is not the same as continuing obligation',
        code: COMPLIANCE_EXPLANATION_CODES.OBLIGATION_NOT_SUBMISSION,
      });
    }
  }

  assertReviewIsNotSubmission(input: { treatingReviewAsSubmission: boolean }): void {
    if (input.treatingReviewAsSubmission) {
      throw new BadRequestException({
        message: 'Compliance review verification is distinct from submission receipt',
        code: COMPLIANCE_EXPLANATION_CODES.SUBMISSION_NOT_VERIFICATION,
      });
    }
  }

  assertReceiptDoesNotSatisfyObligation(input: {
    receiptOnly: boolean;
    obligationSatisfied: boolean;
  }): void {
    if (input.receiptOnly && input.obligationSatisfied) {
      throw new BadRequestException({
        message: 'Receipt acknowledgment alone never satisfies continuing obligation',
        code: COMPLIANCE_EXPLANATION_CODES.RECEIPT_NOT_OBLIGATION_SATISFACTION,
      });
    }
  }

  assertObservationIsNotFinding(input: { autoPromoteObservationToFinding: boolean }): void {
    if (input.autoPromoteObservationToFinding) {
      throw new BadRequestException({
        message: 'Inspection observation cannot be automatically promoted to institutional finding',
        code: COMPLIANCE_EXPLANATION_CODES.OBSERVATION_NOT_FINDING,
      });
    }
  }

  assertFindingIsNotViolation(input: { autoTreatFindingAsViolation: boolean }): void {
    if (input.autoTreatFindingAsViolation) {
      throw new BadRequestException({
        message: 'Inspection finding does not automatically equal noncompliance violation',
        code: COMPLIANCE_EXPLANATION_CODES.FINDING_NOT_VIOLATION,
      });
    }
  }

  assertObservationClassificationAllowed(classification: ComplianceObservationClassification): void {
    if (classification === ComplianceObservationClassification.OBSERVATION) {
      return;
    }
  }

  assertHolderCannotCloseFinding(input: {
    actorIdentityId: string;
    holderIdentityId?: string | null;
  }): void {
    if (input.holderIdentityId && input.actorIdentityId === input.holderIdentityId) {
      throw new ForbiddenException({
        message: 'Instrument holder cannot self-close compliance finding',
        code: COMPLIANCE_EXPLANATION_CODES.HOLDER_CANNOT_CLOSE_FINDING,
      });
    }
  }

  assertHolderCannotVerifyCorrectiveAction(input: {
    verifierIdentityId: string;
    assigneeIdentityId?: string | null;
    holderIdentityId?: string | null;
  }): void {
    if (
      input.holderIdentityId &&
      input.verifierIdentityId === input.holderIdentityId
    ) {
      throw new ForbiddenException({
        message: 'Instrument holder cannot verify own corrective action',
        code: COMPLIANCE_EXPLANATION_CODES.HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION,
      });
    }
    if (
      input.assigneeIdentityId &&
      input.verifierIdentityId === input.assigneeIdentityId
    ) {
      throw new ForbiddenException({
        message: 'Corrective action assignee cannot verify own corrective action',
        code: COMPLIANCE_EXPLANATION_CODES.HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION,
      });
    }
  }

  assertPhase9CannotCreateSuspensionDecision(input: { isCreatingSuspensionDecision: boolean }): void {
    if (input.isCreatingSuspensionDecision) {
      throw new ForbiddenException({
        message: 'Phase 9 cannot create suspension government decisions; use Phase 8 boundary path',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_CREATE_SUSPENSION_DECISION,
      });
    }
  }

  assertPhase9CannotPatchInstrumentStatus(payload: Record<string, unknown>): void {
    if ('status' in payload || 'currentStatus' in payload) {
      throw new ForbiddenException({
        message: 'Phase 9 cannot PATCH official instrument lifecycle status',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS,
      });
    }
  }

  assertReviewOutcomeRequiresExplicitSatisfaction(outcome: ComplianceReviewOutcome): boolean {
    return outcome === ComplianceReviewOutcome.OBLIGATION_SATISFIED;
  }

  assertInstrumentStatusPatchForbidden(
    currentStatus: OfficialInstrumentStatus,
    requestedStatus: OfficialInstrumentStatus,
  ): void {
    if (currentStatus !== requestedStatus) {
      throw new ForbiddenException({
        message: 'Instrument status changes require authorized Phase 8 lifecycle path',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS,
      });
    }
  }

  assertEmergencyActionDoesNotSuspendInstrument(input: {
    doesNotSuspendInstrument: boolean;
    attemptsInstrumentSuspension: boolean;
  }): void {
    if (input.attemptsInstrumentSuspension) {
      throw new ForbiddenException({
        message: 'Emergency interim action cannot suspend instrument from Phase 9',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS,
      });
    }
    if (!input.doesNotSuspendInstrument) {
      throw new BadRequestException({
        message: 'Emergency interim action must explicitly record that it does not suspend instrument',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS,
      });
    }
  }
}
