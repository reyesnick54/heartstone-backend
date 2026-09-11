import { AuthorityDependencyType, InstitutionalActType } from '@prisma/client';

/** Consultation does not satisfy concurrence requirements. */
export function consultationSatisfiesConcurrence(actType: InstitutionalActType): boolean {
  return actType === InstitutionalActType.CONCURRENCE;
}

/** Supervision is not national final approval. */
export function supervisionIsFinalApproval(actType: InstitutionalActType): boolean {
  return actType === InstitutionalActType.DECISION;
}

/** Liaison does not create delegation. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- act type is accepted for semantic clarity in tests
export function liaisonCreatesDelegation(actType: InstitutionalActType): boolean {
  return false;
}

/** Data exchange does not transfer authority. */
export function dataExchangeTransfersAuthority(actType: InstitutionalActType): boolean {
  return actType === InstitutionalActType.DATA_EXCHANGE;
}

export function actTypeSatisfiesDependency(
  dependencyType: AuthorityDependencyType,
  actType: InstitutionalActType,
): boolean {
  switch (dependencyType) {
    case AuthorityDependencyType.GOVERNMENT_CONCURRENCE:
      return actType === InstitutionalActType.CONCURRENCE;
    case AuthorityDependencyType.MANDATORY_CONSULTATION:
      return actType === InstitutionalActType.CONSULTATION;
    case AuthorityDependencyType.SUPERVISORY_REVIEW:
      return actType === InstitutionalActType.SUPERVISION;
    case AuthorityDependencyType.LIAISON:
      return actType === InstitutionalActType.LIAISON;
    case AuthorityDependencyType.SHARED_COORDINATED_ACTION:
      return actType === InstitutionalActType.COORDINATED_ACTION;
    case AuthorityDependencyType.PROFESSIONAL_REVIEW:
      return actType === InstitutionalActType.PROFESSIONAL_DETERMINATION;
    default:
      return false;
  }
}

const AUTHENTICATED_DEPENDENCY_TYPES = new Set<AuthorityDependencyType>([
  AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
  AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
  AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
  AuthorityDependencyType.OTHER_AUTHENTICATED_DEPENDENCY,
]);

export function dependencyRequiresAuthenticatedDetermination(
  dependencyType: AuthorityDependencyType,
): boolean {
  return AUTHENTICATED_DEPENDENCY_TYPES.has(dependencyType);
}

export function isRetainedNationalDependencyType(
  dependencyType: AuthorityDependencyType,
): boolean {
  return (
    dependencyType === AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION ||
    dependencyType === AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION
  );
}
