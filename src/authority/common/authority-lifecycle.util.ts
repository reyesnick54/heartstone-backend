import { AuthorityClassification, FunctionAuthorityLifecycleStatus } from '@prisma/client';

export function isOperationallyActiveLifecycleState(
  state: FunctionAuthorityLifecycleStatus,
): boolean {
  return state === FunctionAuthorityLifecycleStatus.ACTIVE;
}

export function isNonOperationalLifecycleState(state: FunctionAuthorityLifecycleStatus): boolean {
  return (
    state === FunctionAuthorityLifecycleStatus.DRAFT ||
    state === FunctionAuthorityLifecycleStatus.PENDING_ACTIVATION
  );
}

export function isSuspendedLifecycleState(state: FunctionAuthorityLifecycleStatus): boolean {
  return state === FunctionAuthorityLifecycleStatus.SUSPENDED;
}

export function isProhibitedClassification(classification: AuthorityClassification): boolean {
  return classification === AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED;
}

export function canSupportOperationalAuthorityEvaluation(
  lifecycleStatus: FunctionAuthorityLifecycleStatus,
  classification: AuthorityClassification,
): boolean {
  return (
    isOperationallyActiveLifecycleState(lifecycleStatus) &&
    !isProhibitedClassification(classification)
  );
}
