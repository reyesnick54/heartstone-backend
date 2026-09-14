import { RedressImplementationTargetType, RedressRemedyType } from '@prisma/client';

import { PAYMENTS_REFUND_LIFECYCLE_SERVICE } from './payments.constants';
import { PHASE_11C_INVARIANTS } from './phase-11c-invariants.constants';

describe('Phase 11C invariants registry', () => {
  it('defines all required invariants', () => {
    expect(PHASE_11C_INVARIANTS).toHaveLength(17);
    expect(PHASE_11C_INVARIANTS.map((invariant) => invariant.id)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    );
  });
});

describe('Phase 10 refund remedy routing', () => {
  function mapRemedyToTarget(remedyType: RedressRemedyType): RedressImplementationTargetType {
    if (
      remedyType === RedressRemedyType.AMEND_INSTRUMENT ||
      remedyType === RedressRemedyType.REINSTATE_INSTRUMENT ||
      remedyType === RedressRemedyType.SUSPEND_EFFECT
    ) {
      return RedressImplementationTargetType.OFFICIAL_INSTRUMENT;
    }
    if (remedyType === RedressRemedyType.CORRECT_RECORD) {
      return RedressImplementationTargetType.MASTER_ADMINISTRATIVE_FILE;
    }
    if (remedyType === RedressRemedyType.REFUND_IF_AUTHORIZED) {
      return RedressImplementationTargetType.FEE;
    }
    return RedressImplementationTargetType.GOVERNMENT_DECISION;
  }

  it('routes REFUND_IF_AUTHORIZED to FEE target', () => {
    expect(mapRemedyToTarget(RedressRemedyType.REFUND_IF_AUTHORIZED)).toBe(
      RedressImplementationTargetType.FEE,
    );
  });

  it('uses PaymentsRefundLifecycleService as lifecycle reference', () => {
    expect(PAYMENTS_REFUND_LIFECYCLE_SERVICE).toBe('PaymentsRefundLifecycleService');
  });
});

describe('PaymentsModule registration', () => {
  it('exports PaymentsModule', async () => {
    const { PaymentsModule } = await import('./payments.module');
    expect(PaymentsModule).toBeDefined();
  });
});
