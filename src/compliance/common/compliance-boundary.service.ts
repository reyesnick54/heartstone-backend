import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ComplianceObservationClassification,
  ComplianceReviewOutcome,
  ContinuingObligationStatus,
  ObligationStatusChangeActor,
  OfficialInstrumentStatus,
} from '@prisma/client';

import {
  ALLOWED_RECURRENCE_RULE_TYPES,
  COMPLIANCE_EXPLANATION_CODES,
  CONSEQUENTIAL_REVIEW_STATUSES,
  type ControlledRecurrenceConfiguration,
  FORBIDDEN_AI_COMPLIANCE_ACTIONS,
  FORBIDDEN_CLIENT_COMPLIANCE_FIELDS,
  FORBIDDEN_CLIENT_OBLIGATION_FIELDS,
  FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS,
  FORBIDDEN_COMPLIANCE_SUBMISSION_CLIENT_FIELDS,
  HOLDER_ALLOWED_OBLIGATION_STATUSES,
  PROTECTED_OBLIGATION_STATUS_FIELDS,
  REVIEWER_ALLOWED_OBLIGATION_STATUSES,
} from '../compliance.constants';

@Injectable()
export class ComplianceBoundaryService {
  rejectClientProtectedObligationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_OBLIGATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a continuing obligation`);
      }
    }
  }

  assertHolderCannotSetSatisfied(
    actor: ObligationStatusChangeActor,
    targetStatus: ContinuingObligationStatus,
  ): void {
    if (
      actor === ObligationStatusChangeActor.HOLDER &&
      targetStatus === ContinuingObligationStatus.SATISFIED
    ) {
      throw new ForbiddenException(
        'Holder submission does not prove compliance; SATISFIED requires authorized review',
      );
    }
  }

  assertActorMayChangeStatus(
    actor: ObligationStatusChangeActor,
    targetStatus: ContinuingObligationStatus,
  ): void {
    if (actor === ObligationStatusChangeActor.AI_ASSISTANCE) {
      throw new ForbiddenException('AI assistance cannot alter continuing obligation status');
    }

    if (actor === ObligationStatusChangeActor.PAYMENT_SYSTEM) {
      throw new ForbiddenException(
        'Payment receipt does not automatically satisfy substantive compliance obligations',
      );
    }

    if (actor === ObligationStatusChangeActor.HOLDER) {
      if (!HOLDER_ALLOWED_OBLIGATION_STATUSES.includes(targetStatus as never)) {
        throw new ForbiddenException(`Holder may not set obligation status to ${targetStatus}`);
      }
      return;
    }

    if (
      actor === ObligationStatusChangeActor.REVIEWER ||
      actor === ObligationStatusChangeActor.COMPLIANCE_ADMIN
    ) {
      if (!REVIEWER_ALLOWED_OBLIGATION_STATUSES.includes(targetStatus as never)) {
        throw new ForbiddenException(
          `Actor ${actor} may not set obligation status to ${targetStatus}`,
        );
      }
    }
  }

  assertOverdueIsNotAutomaticViolation(reason?: string): void {
    if (reason?.toLowerCase().includes('automatic violation')) {
      throw new BadRequestException('Overdue status does not create an automatic violation');
    }
    if (reason?.toLowerCase().includes('automatic revocation')) {
      throw new BadRequestException('Late report does not trigger automatic revocation');
    }
  }

  assertAiCannotWaive(actor: ObligationStatusChangeActor): void {
    if (actor === ObligationStatusChangeActor.AI_ASSISTANCE) {
      throw new ForbiddenException('AI cannot waive continuing obligations');
    }
  }

  assertAiCannotChangeDeadline(
    payload: Record<string, unknown>,
    actor: ObligationStatusChangeActor,
  ): void {
    if (actor === ObligationStatusChangeActor.AI_ASSISTANCE && 'dueDate' in payload) {
      throw new ForbiddenException('AI cannot change lawful obligation deadlines');
    }
  }

  assertConditionTextImmutable(input: {
    approvedConditionText?: string | null;
    approvedConditionTextHash?: string | null;
    proposedDescription?: string;
    proposedApprovedText?: string;
  }): void {
    if (
      input.approvedConditionText &&
      input.proposedApprovedText &&
      input.proposedApprovedText !== input.approvedConditionText
    ) {
      throw new ForbiddenException(
        'Approved decision condition text cannot be rewritten through compliance administration',
      );
    }

    if (
      input.approvedConditionText &&
      input.proposedDescription &&
      input.proposedDescription !== input.approvedConditionText
    ) {
      throw new ForbiddenException(
        'Obligation description must preserve approved condition wording exactly',
      );
    }
  }

  validateRecurrenceConfiguration(config: unknown): ControlledRecurrenceConfiguration {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('Recurrence configuration must be a structured object');
    }

    const candidate = config as ControlledRecurrenceConfiguration;
    if (!ALLOWED_RECURRENCE_RULE_TYPES.includes(candidate.ruleType)) {
      throw new BadRequestException(
        'Recurrence rules must use controlled rule types; cron expressions are not permitted',
      );
    }

    if (candidate.ruleType === 'CUSTOM_INTERVAL_DAYS') {
      if (!candidate.intervalDays || candidate.intervalDays < 1 || candidate.intervalDays > 3660) {
        throw new BadRequestException(
          'CUSTOM_INTERVAL_DAYS requires intervalDays between 1 and 3660',
        );
      }
    }

    return candidate;
  }

  rejectProtectedStatusPatch(payload: Record<string, unknown>): void {
    for (const field of PROTECTED_OBLIGATION_STATUS_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Obligation status cannot be changed via ordinary PATCH (${field})`,
        );
      }
    }
  }

  rejectForbiddenSubmissionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_COMPLIANCE_SUBMISSION_CLIENT_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(`Client may not set compliance submission field: ${field}`);
      }
    }
  }

  rejectForbiddenReviewFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(`Client may not set compliance review field: ${field}`);
      }
    }
  }

  assertAiCannotFinalize(action: string, isAiActor = false): void {
    if (isAiActor && FORBIDDEN_AI_COMPLIANCE_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(`AI assistance cannot perform compliance action: ${action}`);
    }
  }

  assertAuthorizedReviewerPresent(
    reviewerOfficeholderId: string | undefined,
    status: string,
  ): void {
    if (
      CONSEQUENTIAL_REVIEW_STATUSES.includes(
        status as (typeof CONSEQUENTIAL_REVIEW_STATUSES)[number],
      ) &&
      !reviewerOfficeholderId
    ) {
      throw new BadRequestException(
        'Consequential compliance review outcomes require an identified officeholder reviewer',
      );
    }
  }

  assertExtensionRequiresAuthority(
    effectiveExtendedDueDate: Date | undefined,
    extensionAuthorityReference: string | undefined,
  ): void {
    if (effectiveExtendedDueDate && !extensionAuthorityReference?.trim()) {
      throw new BadRequestException(
        'Deadline extension requires an explicit extension authority reference',
      );
    }
  }

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

  assertObservationClassificationAllowed(
    classification: ComplianceObservationClassification,
  ): void {
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
    verifierIdentityId?: string;
    assigneeIdentityId?: string | null;
    holderIdentityId?: string | null;
    actorRoleMarker?: string;
    targetStatus?: string;
  }): void {
    if (input.holderIdentityId && input.verifierIdentityId === input.holderIdentityId) {
      throw new ForbiddenException({
        message: 'Instrument holder cannot verify own corrective action',
        code: COMPLIANCE_EXPLANATION_CODES.HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION,
      });
    }
    if (input.assigneeIdentityId && input.verifierIdentityId === input.assigneeIdentityId) {
      throw new ForbiddenException({
        message: 'Corrective action assignee cannot verify own corrective action',
        code: COMPLIANCE_EXPLANATION_CODES.HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION,
      });
    }
  }

  assertPhase9CannotCreateSuspensionDecision(input: {
    isCreatingSuspensionDecision: boolean;
  }): void {
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
        message:
          'Emergency interim action must explicitly record that it does not suspend instrument',
        code: COMPLIANCE_EXPLANATION_CODES.PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS,
      });
    }
  }
}
