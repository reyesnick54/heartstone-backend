import { CompletenessReviewItemStatus, CompletenessReviewStatus } from '@prisma/client';

import { CompletenessReviewService } from './completeness-review.service';

describe('CompletenessReviewService (unit)', () => {
  const service = new CompletenessReviewService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('determines INCOMPLETE when required items are deficient', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: CompletenessReviewItemStatus.MISSING },
    ]);

    expect(status).toBe(CompletenessReviewStatus.INCOMPLETE);
  });

  it('determines COMPLETE only from administrative item statuses, not VERIFIED', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: CompletenessReviewItemStatus.NOT_APPLICABLE },
    ]);

    expect(status).toBe(CompletenessReviewStatus.COMPLETE);
    expect(status).not.toBe('VERIFIED');
  });

  it('returns UNRESOLVED when required items remain unresolved', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: CompletenessReviewItemStatus.UNRESOLVED },
    ]);

    expect(status).toBe(CompletenessReviewStatus.UNRESOLVED);
  });
});
