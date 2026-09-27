import {
  AuthorityClassification,
  AuthorityDependencyBlockingStatus,
  AuthorityDependencyType,
  ControlledFunctionClass,
} from '@prisma/client';

/** Delegated functions referenced by the Protocol — inactive until delegating instrument is in force. */
export interface AbsezDelegatedFunctionDefinition {
  code: string;
  name: string;
  description: string;
  functionClass: ControlledFunctionClass;
  governingSourceCode: string;
  delegatingInstrumentCode: string;
  dependencyType: AuthorityDependencyType;
  competentAuthorityLabel: string;
  externalAgencyCode?: string;
}

export const ABSEZ_DELEGATED_FUNCTIONS: readonly AbsezDelegatedFunctionDefinition[] = [
  {
    code: 'ABSEZ-FN-CUSTOMS-FACILITATION',
    name: 'Customs facilitation (delegated)',
    description:
      'Customs facilitation pursuant to delegated powers — inactive until instrument authenticated.',
    functionClass: ControlledFunctionClass.ADMINISTRATIVE,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    delegatingInstrumentCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
    competentAuthorityLabel: 'Comptroller of Customs',
    externalAgencyCode: 'AG-NATL-ADV-CUSTOMS',
  },
  {
    code: 'ABSEZ-FN-IMMIGRATION-FACILITATION',
    name: 'Immigration facilitation (delegated)',
    description: 'Immigration facilitation — inactive until delegating instrument authenticated.',
    functionClass: ControlledFunctionClass.ADMINISTRATIVE,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    delegatingInstrumentCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
    competentAuthorityLabel: 'Chief Immigration Officer',
    externalAgencyCode: 'AG-NATL-ADV-IMMIGRATION',
  },
  {
    code: 'ABSEZ-FN-WORK-PERMIT-FACILITATION',
    name: 'Work permit facilitation (delegated)',
    description: 'Work permit facilitation — inactive until delegating instrument authenticated.',
    functionClass: ControlledFunctionClass.ADMINISTRATIVE,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    delegatingInstrumentCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
    competentAuthorityLabel: 'Labour Department',
    externalAgencyCode: 'AG-NATL-ADV-LABOUR',
  },
  {
    code: 'ABSEZ-FN-FINANCIAL-LICENSING-FACILITATION',
    name: 'Financial services licensing facilitation (delegated)',
    description:
      'Financial licensing coordination — inactive until delegating instrument authenticated.',
    functionClass: ControlledFunctionClass.LICENSING,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    delegatingInstrumentCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
    competentAuthorityLabel: 'Financial Services Regulatory Commission',
    externalAgencyCode: 'AG-NATL-ADV-FSRC',
  },
  {
    code: 'ABSEZ-FN-CITIZENSHIP-RESIDENCY-FACILITATION',
    name: 'Citizenship and residency facilitation (delegated)',
    description:
      'Citizenship/residency coordination — inactive until delegating instrument authenticated.',
    functionClass: ControlledFunctionClass.ADMINISTRATIVE,
    governingSourceCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    delegatingInstrumentCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
    competentAuthorityLabel: 'Chief Immigration Officer',
    externalAgencyCode: 'AG-NATL-ADV-IMMIGRATION',
  },
] as const;

export const DELEGATED_FUNCTION_CLASSIFICATION = AuthorityClassification.ABSEZ_DELEGATED;
export const DELEGATED_FUNCTION_DEPENDENCY_BLOCKING = AuthorityDependencyBlockingStatus.BLOCKING;
