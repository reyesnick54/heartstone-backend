import { DriverLicenseLifecycleStatus } from '@prisma/client';

export function resolveDriverLicenseLifecycle(input: {
  lifecycleStatus: DriverLicenseLifecycleStatus;
  validUntil?: Date | null;
  now?: Date;
}): DriverLicenseLifecycleStatus {
  const now = input.now ?? new Date();
  if (
    input.validUntil &&
    input.validUntil.getTime() < now.getTime() &&
    input.lifecycleStatus !== DriverLicenseLifecycleStatus.REVOKED &&
    input.lifecycleStatus !== DriverLicenseLifecycleStatus.SUPERSEDED &&
    input.lifecycleStatus !== DriverLicenseLifecycleStatus.SUSPENDED
  ) {
    return DriverLicenseLifecycleStatus.EXPIRED;
  }
  return input.lifecycleStatus;
}
