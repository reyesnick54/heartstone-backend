import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  DecisionAssistanceStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  GovernmentDecisionOutcome,
  GovernmentDecisionStatus,
} from '@prisma/client';

import {
  AI_DRAFT_REQUIRES_HUMAN_CONFIRMATION_MESSAGE,
  NOTICE_DOES_NOT_ISSUE_INSTRUMENT_MESSAGE,
  PRECEDENT_BLOCKS_ISSUANCE_MESSAGE,
  RETURN_FOR_INFO_CANNOT_MASK_REFUSAL_MESSAGE,
} from '../decisions.constants';

export class DecisionsBoundaryService {
  assertDecisionMutable(status: GovernmentDecisionStatus): void {
    if (
      status === GovernmentDecisionStatus.FINALIZED ||
      status === GovernmentDecisionStatus.SUPERSEDED
    ) {
      throw new ForbiddenException('Finalized or superseded decisions cannot be silently altered');
    }
  }

  assertReasonsRequired(requiresReasons: boolean, reasonCount: number): void {
    if (requiresReasons && reasonCount === 0) {
      throw new BadRequestException(
        'Final decision requires institutional reasons where configured',
      );
    }
  }

  assertAiDraftConfirmed(
    requiresHumanConfirmation: boolean,
    assistanceStatus: DecisionAssistanceStatus | null | undefined,
  ): void {
    if (
      requiresHumanConfirmation &&
      assistanceStatus !== null &&
      assistanceStatus !== undefined &&
      assistanceStatus !== DecisionAssistanceStatus.ACCEPTED
    ) {
      throw new ForbiddenException(AI_DRAFT_REQUIRES_HUMAN_CONFIRMATION_MESSAGE);
    }
  }

  assertReturnForInfoNotMaskingRefusal(input: {
    outcome: GovernmentDecisionOutcome;
    isFinalAdverse: boolean;
  }): void {
    if (
      input.outcome === GovernmentDecisionOutcome.RETURN_FOR_INFORMATION &&
      input.isFinalAdverse
    ) {
      throw new BadRequestException(RETURN_FOR_INFO_CANNOT_MASK_REFUSAL_MESSAGE);
    }
  }

  assertConditionNotSilentlyAltered(input: {
    approvedTextHash: string | null;
    currentText: string;
    nextText: string;
  }): void {
    if (!input.approvedTextHash) {
      return;
    }

    if (input.currentText !== input.nextText) {
      throw new ForbiddenException(
        'Approved decision conditions cannot be silently altered; amendment requires an authorized lifecycle action',
      );
    }
  }

  assertIssuanceNotBlocked(input: {
    blocksIssuanceOnUnsatisfiedPrecedent: boolean;
    permitsIssuanceDespiteUnsatisfiedPrecedent: boolean;
    unsatisfiedPrecedentCount: number;
  }): void {
    if (
      input.blocksIssuanceOnUnsatisfiedPrecedent &&
      !input.permitsIssuanceDespiteUnsatisfiedPrecedent &&
      input.unsatisfiedPrecedentCount > 0
    ) {
      throw new ForbiddenException(PRECEDENT_BLOCKS_ISSUANCE_MESSAGE);
    }
  }

  assertNoticeDoesNotIssueInstrument(): void {
    // Explicit guard for callers that might conflate notice finalization with issuance.
    throw new ForbiddenException(NOTICE_DOES_NOT_ISSUE_INSTRUMENT_MESSAGE);
  }

  isUnsatisfiedPrecedentCondition(condition: {
    conditionType: DecisionConditionType;
    status: DecisionConditionStatus;
  }): boolean {
    if (condition.conditionType !== DecisionConditionType.PRECEDENT_TO_ISSUANCE) {
      return false;
    }

    const satisfiedStatuses: DecisionConditionStatus[] = [
      DecisionConditionStatus.SATISFIED,
      DecisionConditionStatus.WAIVED_BY_AUTHORIZED_DECISION,
      DecisionConditionStatus.CLOSED,
      DecisionConditionStatus.SUPERSEDED,
    ];

    return !satisfiedStatuses.includes(condition.status);
  }
}
