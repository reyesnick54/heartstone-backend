import { AuthorityClassification, AuthorityLifecycleState } from '@prisma/client';

export function isOperationallyActiveLifecycleState(state: AuthorityLifecycleState): boolean {
  return state === AuthorityLifecycleState.ACTIVE;
}

export function isNonOperationalLifecycleState(state: AuthorityLifecycleState): boolean {
  return state === AuthorityLifecycleState.RECOGNIZED || state === AuthorityLifecycleState.REVIEWED;
}

export function isSuspendedLifecycleState(state: AuthorityLifecycleState): boolean {
  return state === AuthorityLifecycleState.SUSPENDED;
}

export function isProhibitedClassification(classification: AuthorityClassification): boolean {
  return classification === AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED;
}

export function canSupportOperationalAuthorityEvaluation(
  lifecycleState: AuthorityLifecycleState,
  authorityClassification: AuthorityClassification,
): boolean {
  return (
    isOperationallyActiveLifecycleState(lifecycleState) &&
    !isProhibitedClassification(authorityClassification)
  );
}
