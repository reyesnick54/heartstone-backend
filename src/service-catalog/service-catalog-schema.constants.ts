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

export const FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS = [
  'paymentStatus',
  'paymentState',
  'isPaid',
  'paymentConfirmed',
  'paymentApproved',
  'approvalOnExpiry',
  'autoApproveOnExpiry',
  'issuedCertificateId',
  'issuedLicenseId',
  'decisionOutcome',
  'appealDecision',
  'appealOutcome',
  'waived',
  'feeWaived',
  'authorityTransferred',
  'conferredAuthority',
] as const;
