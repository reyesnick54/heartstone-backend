import { IdentityOfficeholderLinkStatus } from '@prisma/client';

import { isIdentityOfficeholderLinkActive } from './is-active-link.util';

describe('isIdentityOfficeholderLinkActive', () => {
  const baseLink = {
    status: IdentityOfficeholderLinkStatus.VERIFIED,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
  };

  it('returns true for verified links within the effective period', () => {
    expect(isIdentityOfficeholderLinkActive(baseLink, new Date('2026-06-01T00:00:00.000Z'))).toBe(
      true,
    );
  });

  it('returns false for pending links', () => {
    expect(
      isIdentityOfficeholderLinkActive(
        { ...baseLink, status: IdentityOfficeholderLinkStatus.PENDING },
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('returns false for suspended or revoked links', () => {
    expect(
      isIdentityOfficeholderLinkActive(
        { ...baseLink, status: IdentityOfficeholderLinkStatus.SUSPENDED },
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(false);

    expect(
      isIdentityOfficeholderLinkActive(
        { ...baseLink, status: IdentityOfficeholderLinkStatus.REVOKED },
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('returns false before effectiveFrom and after effectiveUntil', () => {
    expect(isIdentityOfficeholderLinkActive(baseLink, new Date('2025-12-31T23:59:59.999Z'))).toBe(
      false,
    );

    expect(
      isIdentityOfficeholderLinkActive(
        {
          ...baseLink,
          effectiveUntil: new Date('2026-06-01T00:00:00.000Z'),
        },
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});
