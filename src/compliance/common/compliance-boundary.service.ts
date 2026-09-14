import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import {
  ContinuingObligationStatus,
  ObligationStatusChangeActor,
} from '@prisma/client';

import {
  ALLOWED_RECURRENCE_RULE_TYPES,
  type ControlledRecurrenceConfiguration,
  FORBIDDEN_CLIENT_OBLIGATION_FIELDS,
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
        throw new ForbiddenException(
          `Holder may not set obligation status to ${targetStatus}`,
        );
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

  assertAiCannotChangeDeadline(payload: Record<string, unknown>, actor: ObligationStatusChangeActor): void {
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
}
