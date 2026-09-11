import { DelegationStatus } from '@prisma/client';

export interface DelegationCurrentFields {
  status: DelegationStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export function isDelegationCurrent(
  delegation: DelegationCurrentFields,
  at: Date = new Date(),
): boolean {
  if (delegation.status !== DelegationStatus.ACTIVE) {
    return false;
  }

  if (delegation.effectiveFrom > at) {
    return false;
  }

  if (delegation.effectiveUntil !== null && delegation.effectiveUntil <= at) {
    return false;
  }

  return true;
}
