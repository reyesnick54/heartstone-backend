export const AUTHORITY_CLASSIFICATIONS = [
  'ABSEZ_OWNED',
  'ABSEZ_DELEGATED',
  'EXPRESSLY_RETAINED_NATIONAL',
  'SHARED_OR_COORDINATED',
  'RESERVED_PROFESSIONAL',
  'ADMINISTRATIVE_SUPPORT',
  'TECHNOLOGY_ASSISTED',
  'PROHIBITED_OR_UNAUTHORIZED',
] as const;

export const FUNCTION_AUTHORITY_LIFECYCLE_STATES = [
  'DRAFT',
  'PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE',
  'ARCHIVED',
] as const;

export const CONTROLLED_FUNCTION_CLASSES = [
  'LICENSING',
  'APPROVAL',
  'INSPECTION',
  'REGISTRATION',
  'ENFORCEMENT',
  'ADVISORY',
  'ADMINISTRATIVE',
  'INFORMATIONAL',
  'OTHER',
] as const;

export const FORBIDDEN_AUTHORITY_BOUNDARY_FIELDS = [
  'canApprove',
  'isAdminAuthority',
  'isGovernmentAuthority',
] as const;

export const AUTHORITY_MODEL_NAMES = [
  'FunctionAuthorityRecord',
  'GoverningSource',
  'GoverningSourceVersion',
  'GoverningSourceRelationship',
  'FunctionGoverningSource',
  'FunctionAuthorityAssignment',
  'AuthorityActionRight',
  'AuthorityCondition',
  'AuthorityDependency',
  'SegregationOfDutyRule',
  'RetainedNationalDetermination',
  'AuthorityEvaluationRecord',
  'FunctionActivationAudit',
] as const;

export const NON_AUTHORITY_MODEL_NAMES = [
  'UserAccount',
  'Identity',
  'Credential',
  'OrganizationMembership',
  'AuthenticationMethod',
  'Session',
  'Appointment',
  'Delegation',
  'Officeholder',
] as const;
