import { CapabilityMaturityState } from '@prisma/client';

import { MATURITY_ADVANCEMENT_PATH } from '../operational-readiness.constants';

export function getMaturityIndex(state: CapabilityMaturityState): number {
  const index = MATURITY_ADVANCEMENT_PATH.indexOf(state);
  return index;
}

export function isValidMaturityAdvancement(
  current: CapabilityMaturityState,
  requested: CapabilityMaturityState,
): boolean {
  if (current === requested) {
    return false;
  }

  if (requested === CapabilityMaturityState.SUSPENDED) {
    return current !== CapabilityMaturityState.RETIRED && current !== CapabilityMaturityState.REPLACED;
  }

  if (requested === CapabilityMaturityState.REVALIDATION_REQUIRED) {
    return (
      current !== CapabilityMaturityState.CONCEPTUAL &&
      current !== CapabilityMaturityState.RETIRED &&
      current !== CapabilityMaturityState.REPLACED
    );
  }

  if (requested === CapabilityMaturityState.REVALIDATED) {
    return current === CapabilityMaturityState.REVALIDATION_REQUIRED;
  }

  if (requested === CapabilityMaturityState.RETIRED) {
    return current !== CapabilityMaturityState.OPERATIONALLY_ACTIVATED;
  }

  if (requested === CapabilityMaturityState.REPLACED) {
    return current === CapabilityMaturityState.RETIRED;
  }

  const currentIndex = getMaturityIndex(current);
  const requestedIndex = getMaturityIndex(requested);

  if (currentIndex === -1 || requestedIndex === -1) {
    return false;
  }

  return requestedIndex === currentIndex + 1;
}

export function requiresProductionReadinessGate(requested: CapabilityMaturityState): boolean {
  return requested === CapabilityMaturityState.PRODUCTION_READY;
}

export function requiresInstitutionalAcceptanceGate(
  requested: CapabilityMaturityState,
): boolean {
  return requested === CapabilityMaturityState.INSTITUTIONALLY_ACCEPTED;
}

export function requiresOperationalActivationGate(requested: CapabilityMaturityState): boolean {
  return requested === CapabilityMaturityState.OPERATIONALLY_ACTIVATED;
}
