export const SERVICE_FEE_CALCULATION_TYPES = [
  'FIXED',
  'PERCENTAGE',
  'TIERED',
  'FORMULA_REFERENCE',
  'VARIABLE_BY_CLASSIFICATION',
  'EXTERNAL_FEE',
  'NO_FEE',
] as const;

export const SERVICE_DEPENDENCY_TYPES = [
  'GOVERNMENT',
  'PROFESSIONAL',
  'UTILITY',
  'REGISTRY',
  'VENDOR',
  'PARTNER',
  'PAYMENT',
  'IDENTITY',
  'INTEGRATION',
  'OTHER',
] as const;

export const SERVICE_OUTPUT_TYPES = [
  'ACKNOWLEDGMENT',
  'NOTICE',
  'CERTIFICATE',
  'LICENSE',
  'PERMIT',
  'REGISTRATION',
  'REFERRAL',
  'REPORT',
  'DECISION',
  'OTHER',
] as const;

export const SERVICE_REDRESS_ROUTE_TYPES = [
  'CORRECTION',
  'COMPLAINT',
  'RECONSIDERATION',
  'ADMINISTRATIVE_REVIEW',
  'APPEAL',
  'EXTERNAL_REVIEW',
  'JUDICIAL_REVIEW_INFORMATION',
export const SERVICE_CATALOG_MODEL_NAMES = [
  'GovernmentService',
  'GovernmentServiceVersion',
  'ServiceEligibilityRule',
  'ServiceEligibilityRuleAudit',
export const GOVERNMENT_SERVICE_MATURITY_STATUSES = [
  'DRAFT',
  'RECOGNIZED',
  'APPROVED',
  'CONFIGURED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED',
] as const;

export const GOVERNMENT_SERVICE_PUBLIC_AVAILABILITY_MODES = [
  'HIDDEN',
  'INFORMATION_ONLY',
  'PRE_APPLICATION',
  'PILOT_ONLY',
  'ACTIVE',
  'SUSPENDED',
  'UNAVAILABLE',
  'UNDER_DEVELOPMENT',
] as const;

export const APPLICANT_CATEGORIES = [
  'INDIVIDUAL',
  'CITIZEN',
  'RESIDENT',
  'NON_RESIDENT',
  'BUSINESS',
  'COMPANY',
  'INVESTOR',
  'EMPLOYER',
  'EMPLOYEE',
  'AUTHORIZED_REPRESENTATIVE',
  'PROFESSIONAL',
  'GOVERNMENT_ENTITY',
  'PARTNER_ORGANIZATION',
  'OTHER',
] as const;

export const SERVICE_CATALOG_MODEL_NAMES = [
  'GovernmentService',
  'ServiceVersion',
  'ServiceFeeDefinition',
  'ServiceLevelTarget',
  'ServiceDependencyDefinition',
  'ServiceOutputDefinition',
  'ServiceRedressRoute',
] as const;

export const FORBIDDEN_SERVICE_CATALOG_PAYMENT_FIELDS = [
  'paymentStatus',
  'paymentState',
  'isPaid',
  'paymentConfirmed',
  'paymentApproved',
] as const;

export const FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS = [
  ...FORBIDDEN_SERVICE_CATALOG_PAYMENT_FIELDS,
  'approvalOnExpiry',
  'autoApproveOnExpiry',
  'issuedCertificateId',
  'issuedLicenseId',
  'decisionOutcome',
  'appealDecision',
  'appealOutcome',
  'authorityTransferred',
  'conferredAuthority',
  'ServiceFamily',
  'GovernmentService',
  'GovernmentServiceVersion',
  'ServiceFunctionMapping',
  'GovernmentServiceVersionApplicantCategory',
] as const;

export const FORBIDDEN_SERVICE_CATALOG_AUTHORITY_FIELDS = [
  'classification',
  'functionClass',
  'lifecycleStatus',
  'governingSourceId',
  'authorityAction',
  'permitted',
] as const;
