import {
  DecisionAssistanceStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  GovernmentDecisionOutcome,
} from '@prisma/client';

import { DecisionsBoundaryService } from './common/decisions-boundary.service';
import {
  AI_DRAFT_REQUIRES_HUMAN_CONFIRMATION_MESSAGE,
  NOTICE_DOES_NOT_ISSUE_INSTRUMENT_MESSAGE,
  PRECEDENT_BLOCKS_ISSUANCE_MESSAGE,
  RETURN_FOR_INFO_CANNOT_MASK_REFUSAL_MESSAGE,
} from './decisions.constants';

describe('Phase 8C decision invariants (must-fail)', () => {
  const boundary = new DecisionsBoundaryService();

  it('final decision requires reasons where configured', () => {
    expect(() => {
      boundary.assertReasonsRequired(true, 0);
    }).toThrow(/requires institutional reasons/i);
  });

  it('AI draft cannot become final without human confirmation', () => {
    expect(() => {
      boundary.assertAiDraftConfirmed(true, DecisionAssistanceStatus.DRAFT);
    }).toThrow(AI_DRAFT_REQUIRES_HUMAN_CONFIRMATION_MESSAGE);
  });

  it('condition precedent blocks later issuance', () => {
    expect(() => {
      boundary.assertIssuanceNotBlocked({
        blocksIssuanceOnUnsatisfiedPrecedent: true,
        permitsIssuanceDespiteUnsatisfiedPrecedent: false,
        unsatisfiedPrecedentCount: 1,
      });
    }).toThrow(PRECEDENT_BLOCKS_ISSUANCE_MESSAGE);
  });

  it('ordinary admin cannot silently alter approved condition', () => {
    expect(() => {
      boundary.assertConditionNotSilentlyAltered({
        approvedTextHash: 'abc',
        currentText: 'Approved text',
        nextText: 'Changed text',
      });
    }).toThrow(/cannot be silently altered/i);
  });

  it('return for information cannot mask final adverse decision', () => {
    expect(() => {
      boundary.assertReturnForInfoNotMaskingRefusal({
        outcome: GovernmentDecisionOutcome.RETURN_FOR_INFORMATION,
        isFinalAdverse: true,
      });
    }).toThrow(RETURN_FOR_INFO_CANNOT_MASK_REFUSAL_MESSAGE);
  });

  it('DecisionNotice does not issue instrument', () => {
    expect(() => {
      boundary.assertNoticeDoesNotIssueInstrument();
    }).toThrow(NOTICE_DOES_NOT_ISSUE_INSTRUMENT_MESSAGE);
  });

  it('detects unsatisfied precedent to issuance conditions', () => {
    expect(
      boundary.isUnsatisfiedPrecedentCondition({
        conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
        status: DecisionConditionStatus.PENDING,
      }),
    ).toBe(true);

    expect(
      boundary.isUnsatisfiedPrecedentCondition({
        conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
        status: DecisionConditionStatus.SATISFIED,
      }),
    ).toBe(false);
  });
});
