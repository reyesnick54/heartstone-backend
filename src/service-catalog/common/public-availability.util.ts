import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export function isPubliclyActive(
  maturityStatus: GovernmentServiceMaturityStatus,
  publicAvailability: GovernmentServicePublicAvailability,
): boolean {
  return (
    maturityStatus === GovernmentServiceMaturityStatus.ACTIVE &&
    publicAvailability === GovernmentServicePublicAvailability.ACTIVE
  );
}

export function isSuspendedFromPublic(
  maturityStatus: GovernmentServiceMaturityStatus,
  publicAvailability: GovernmentServicePublicAvailability,
): boolean {
  return (
    maturityStatus === GovernmentServiceMaturityStatus.SUSPENDED ||
    publicAvailability === GovernmentServicePublicAvailability.SUSPENDED ||
    publicAvailability === GovernmentServicePublicAvailability.UNAVAILABLE
  );
}
