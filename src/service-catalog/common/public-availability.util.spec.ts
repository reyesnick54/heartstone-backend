import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

import { isPubliclyActive, isSuspendedFromPublic } from './public-availability.util';

describe('public availability helpers', () => {
  it('treats ACTIVE maturity with ACTIVE public availability as publicly active', () => {
    expect(
      isPubliclyActive(
        GovernmentServiceMaturityStatus.ACTIVE,
        GovernmentServicePublicAvailability.ACTIVE,
      ),
    ).toBe(true);
  });

  it('does not treat CONFIGURED maturity as publicly active', () => {
    expect(
      isPubliclyActive(
        GovernmentServiceMaturityStatus.CONFIGURED,
        GovernmentServicePublicAvailability.ACTIVE,
      ),
    ).toBe(false);
  });

  it('does not treat HIDDEN public availability as publicly active even when maturity is ACTIVE', () => {
    expect(
      isPubliclyActive(
        GovernmentServiceMaturityStatus.ACTIVE,
        GovernmentServicePublicAvailability.HIDDEN,
      ),
    ).toBe(false);
  });

  it('treats suspended maturity or availability as not publicly active', () => {
    expect(
      isSuspendedFromPublic(
        GovernmentServiceMaturityStatus.SUSPENDED,
        GovernmentServicePublicAvailability.ACTIVE,
      ),
    ).toBe(true);

    expect(
      isSuspendedFromPublic(
        GovernmentServiceMaturityStatus.ACTIVE,
        GovernmentServicePublicAvailability.SUSPENDED,
      ),
    ).toBe(true);
  });
});
