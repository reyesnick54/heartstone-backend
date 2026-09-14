import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FeeScheduleLifecycleStatus, IdentityType } from '@prisma/client';

import { FinancialBoundaryService } from './common/financial-boundary.service';
import {
  assertIntegerCents,
  assertSameCurrency,
  rejectFxConversion,
} from './common/monetary-arithmetic.util';
import {
  FINANCIAL_REASON_CODES,
  FORBIDDEN_AI_FINANCIAL_ACTIONS,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from './financial-administration.constants';

describe('Phase 11A must-fail invariants', () => {
  const boundary = new FinancialBoundaryService();

  it('must fail: inactive fee schedule cannot be used', () => {
    expect(() => {
      boundary.assertScheduleVersionUsableForAssessment(FeeScheduleLifecycleStatus.DRAFT);
    }).toThrow(FINANCIAL_REASON_CODES.SCHEDULE_NOT_ACTIVE);
  });

  it('must fail: applicant cannot set fee amount', () => {
    expect(() => {
      boundary.rejectClientProtectedFeeAssessmentFields({ subtotalCents: 1 });
    }).toThrow(ForbiddenException);
    expect(() => {
      boundary.rejectClientProtectedFeeAssessmentFields({ totalCents: 1 });
    }).toThrow(FINANCIAL_REASON_CODES.CLIENT_AMOUNT_FORBIDDEN);
  });

  it('must fail: frontend cannot select arbitrary fee', () => {
    expect(() => {
      boundary.assertClientCannotSelectArbitraryFee('arbitrary-item', ['allowed-item']);
    }).toThrow(FINANCIAL_REASON_CODES.ARBITRARY_FEE_FORBIDDEN);
  });

  it('must fail: AI cannot waive fee', () => {
    for (const action of FORBIDDEN_AI_FINANCIAL_ACTIONS) {
      expect(() => {
        boundary.assertAiCannotPerformFinancialAction(IdentityType.SERVICE, action);
      }).toThrow(/AI assistance cannot perform financial action/);
    }
  });

  it('must fail: technical admin cannot make institutional fee decision', () => {
    expect(() => {
      boundary.assertTechnicalAdminCannotActivateFeeSchedule(TECHNICAL_ADMIN_ROLE_MARKER);
    }).toThrow(FINANCIAL_REASON_CODES.ADMIN_OVERRIDE_FORBIDDEN);
  });

  it('must fail: currency mismatch rejected', () => {
    expect(() => {
      assertSameCurrency('XCD', 'EUR');
    }).toThrow(FINANCIAL_REASON_CODES.CURRENCY_MISMATCH);
  });

  it('must fail: unconfigured FX conversion rejected', () => {
    expect(() => {
      rejectFxConversion('XCD', 'USD', false);
    }).toThrow(FINANCIAL_REASON_CODES.FX_NOT_CONFIGURED);
  });

  it('must fail: floating point monetary arithmetic rejected', () => {
    expect(() => {
      assertIntegerCents(99.99, 'amount');
    }).toThrow(BadRequestException);
  });
});
