import { AuthorityDependencyType, type InstitutionalActType } from '@prisma/client';

import { actTypeSatisfiesDependency } from '../../authority/common/dependency-semantics.util';

/** Consultation does not satisfy concurrence requirements. */
export function consultationSatisfiesConcurrenceRequirement(
  dependencyType: AuthorityDependencyType,
  actType: InstitutionalActType,
): boolean {
  if (dependencyType !== AuthorityDependencyType.GOVERNMENT_CONCURRENCE) {
    return false;
  }
  return actTypeSatisfiesDependency(dependencyType, actType);
}

/** External referral responses are not ABSEZ government decisions. */
export function externalResponseIsAbsezDecision(isExternalSource: boolean): boolean {
  return !isExternalSource;
}

/** Liaison referral activity does not create delegation. */
export function referralCreatesDelegation(): boolean {
  return false;
}

/** Escalation must not bypass retained authority boundaries. */
export function escalationBypassesAuthority(): boolean {
  return false;
}

/** SLA breach may alert but must not approve an application. */
export function slaBreachApprovesApplication(): boolean {
  return false;
}
