import {
  ApplicationCaseCompletenessReviewItemStatus,
  ApplicationCaseCompletenessReviewStatus,
} from '@prisma/client';

import { CompletenessReviewService } from './completeness-review.service';

describe('CompletenessReviewService (unit)', () => {
  const service = new CompletenessReviewService({} as never, {} as never, {} as never, {} as never);

  it('determines INCOMPLETE when required items are deficient', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.MISSING },
    ]);

    expect(status).toBe(ApplicationCaseCompletenessReviewStatus.INCOMPLETE);
  });

  it('determines COMPLETE only from administrative item statuses, not VERIFIED', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.NOT_APPLICABLE },
    ]);

    expect(status).toBe(ApplicationCaseCompletenessReviewStatus.COMPLETE);
    expect(status).not.toBe('VERIFIED');
  });

  it('returns UNRESOLVED when required items remain unresolved', () => {
    const status = service.determineCompletenessFromItems([
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: ApplicationCaseCompletenessReviewItemStatus.UNRESOLVED },
    ]);

    expect(status).toBe(ApplicationCaseCompletenessReviewStatus.UNRESOLVED);
  });
});
