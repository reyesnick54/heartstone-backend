import { ImmigrationCredentialLifecycleStatus } from '@prisma/client';

export function resolveImmigrationCredentialLifecycle(input: {
  lifecycleStatus: ImmigrationCredentialLifecycleStatus;
  validUntil?: Date | null;
  now?: Date;
}): ImmigrationCredentialLifecycleStatus {
  const now = input.now ?? new Date();
  if (
    input.validUntil &&
    input.validUntil.getTime() < now.getTime() &&
    input.lifecycleStatus !== ImmigrationCredentialLifecycleStatus.REVOKED &&
    input.lifecycleStatus !== ImmigrationCredentialLifecycleStatus.SUPERSEDED &&
    input.lifecycleStatus !== ImmigrationCredentialLifecycleStatus.SURRENDERED
  ) {
    return ImmigrationCredentialLifecycleStatus.EXPIRED;
  }
  return input.lifecycleStatus;
}
