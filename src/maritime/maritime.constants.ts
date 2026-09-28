export const MARITIME_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const MARITIME_SERVICE_PACK_ID = 'template-blue-economy-maritime';
export const MARITIME_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-MARITIME';
export const MARITIME_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-MARITIME';
export const MARITIME_INSTITUTION_CODE = 'TEMPLATE-INSTITUTION';
export const MARITIME_SERVICE_CODE_PREFIX = 'TEMPLATE-MAR-';

export const MARITIME_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-MAR-INTAKE',
  substantiveReview: 'TEMPLATE-AUTH-MAR-SUBSTANTIVE-REVIEW',
  inspectionCoordination: 'TEMPLATE-AUTH-MAR-INSPECTION',
  externalReferral: 'TEMPLATE-AUTH-MAR-EXTERNAL-REFERRAL',
  decide: 'TEMPLATE-AUTH-MAR-DECIDE',
  issue: 'TEMPLATE-AUTH-MAR-ISSUE',
  complianceReview: 'TEMPLATE-AUTH-MAR-COMPLIANCE-REVIEW',
} as const;

export const VESSEL_RECORD_REFERENCE_PREFIX = 'VSL';
export const MARITIME_INSTRUMENT_PREFIX = 'MINST';
export const MARITIME_EXTERNAL_DEPENDENCY_PREFIX = 'MED';

export const MARITIME_BOUNDARY_DISCLAIMER =
  'Maritime administrative filings and vessel identity records document submitted materials and configured status only; they do not substitute competent external registration or port authority determinations.';

export const MARITIME_CUSTOMS_SEPARATION_DISCLAIMER =
  'Maritime or blue-economy administrative outcomes do not authorize customs release, port clearance, or cargo discharge; those domains retain independent authority boundaries.';

export const FORBIDDEN_AI_MARITIME_ACTIONS = [
  'ISSUE_MARITIME_INSTRUMENT',
  'RECORD_FLAG_STATE_REGISTRATION',
  'AUTHORIZE_CUSTOMS_RELEASE',
  'FINALIZE_VESSEL_REGISTRATION',
] as const;

export const MARITIME_INVARIANTS = {
  vesselRecordCanonical: true,
  partyReferencesNotDuplicated: true,
  externalDependencyBlocksWhenRequired: true,
  maritimeApprovalDoesNotAuthorizeCustomsRelease: true,
  inspectionUsesCanonicalInfrastructure: true,
  issuanceRequiresAuthorityAndInstrument: true,
  noHardcodedNationalMaritimeLaw: true,
  institutionIsolationEnforced: true,
} as const;

export const MARITIME_REASON_CODES = {
  CROSS_INSTITUTION_ACCESS_DENIED: 'MARITIME_CROSS_INSTITUTION_ACCESS_DENIED',
  CONFIDENTIAL_VESSEL_ACCESS_DENIED: 'MARITIME_CONFIDENTIAL_VESSEL_ACCESS_DENIED',
  SECURITY_SENSITIVE_ACCESS_DENIED: 'MARITIME_SECURITY_SENSITIVE_ACCESS_DENIED',
  INSTRUMENT_AUTHORITY_NOT_CONFIGURED: 'MARITIME_INSTRUMENT_AUTHORITY_NOT_CONFIGURED',
  EXTERNAL_DEPENDENCY_BLOCKS: 'MARITIME_EXTERNAL_DEPENDENCY_BLOCKS',
  APPLICANT_CANNOT_SELF_ISSUE: 'MARITIME_APPLICANT_CANNOT_SELF_ISSUE',
  NATIONAL_DECISION_CANNOT_BE_SPOOFED: 'MARITIME_NATIONAL_DECISION_CANNOT_BE_SPOOFED',
  MARITIME_APPROVAL_NOT_CUSTOMS_RELEASE: 'MARITIME_APPROVAL_NOT_CUSTOMS_RELEASE',
} as const;

export const MARITIME_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'VESSEL-ADMIN-INTAKE',
    name: 'Vessel Administrative Intake',
    serviceType: 'REGISTRATION',
    requiresExternal: true,
    requiresInspection: false,
  },
  {
    key: 'MARITIME-SERVICE-LICENCE',
    name: 'Maritime Service Licence Application',
    serviceType: 'APPLICATION',
    requiresExternal: true,
    requiresInspection: true,
  },
  {
    key: 'MARITIME-LICENCE-RENEWAL',
    name: 'Maritime Service Licence Renewal',
    serviceType: 'RENEWAL',
    requiresExternal: false,
    requiresInspection: false,
  },
  {
    key: 'MARITIME-INSPECTION',
    name: 'Maritime Inspection Coordination',
    serviceType: 'INSPECTION',
    requiresExternal: false,
    requiresInspection: true,
  },
  {
    key: 'MARITIME-COMPLIANCE-REPORT',
    name: 'Periodic Maritime Compliance Reporting',
    serviceType: 'COMPLIANCE',
    requiresExternal: false,
    requiresInspection: false,
  },
  {
    key: 'BLUE-ECONOMY-ACTIVITY',
    name: 'Blue Economy Activity Authorization',
    serviceType: 'APPLICATION',
    requiresExternal: false,
    requiresInspection: false,
  },
] as const;
