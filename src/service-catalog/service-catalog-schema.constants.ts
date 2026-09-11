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
