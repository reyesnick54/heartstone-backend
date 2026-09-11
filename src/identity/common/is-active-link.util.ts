import { type IdentityOfficeholderLink, IdentityOfficeholderLinkStatus } from '@prisma/client';

export function isIdentityOfficeholderLinkActive(
  link: Pick<IdentityOfficeholderLink, 'status' | 'effectiveFrom' | 'effectiveUntil'>,
  at: Date = new Date(),
): boolean {
  if (link.status !== IdentityOfficeholderLinkStatus.VERIFIED) {
    return false;
  }

  if (link.effectiveFrom && link.effectiveFrom > at) {
    return false;
  }

  if (link.effectiveUntil && link.effectiveUntil <= at) {
    return false;
  }

  return true;
}
