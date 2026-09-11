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

export const FORM_FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'INTEGER',
  'DECIMAL',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'RADIO',
  'CHECKBOX',
  'EMAIL',
  'PHONE',
  'COUNTRY',
  'CURRENCY',
  'ADDRESS',
  'IDENTIFIER',
  'FILE_REFERENCE',
  'DECLARATION',
  'INFORMATION_DISPLAY',
] as const;

export const FORM_CONDITIONAL_ACTIONS = ['SHOW', 'HIDE', 'REQUIRE', 'OPTIONAL'] as const;

export const FORM_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED'] as const;

export const SERVICE_CATALOG_MODEL_NAMES = [
  'ServiceFamily',
  'GovernmentService',
  'GovernmentServiceVersion',
  'ServiceFunctionMapping',
  'GovernmentServiceVersionApplicantCategory',
  'FormDefinition',
  'FormVersion',
  'FormSection',
  'FormField',
  'FormFieldConditionalRule',
] as const;

export const FORBIDDEN_SERVICE_CATALOG_AUTHORITY_FIELDS = [
  'classification',
  'functionClass',
  'lifecycleStatus',
  'governingSourceId',
  'authorityAction',
  'permitted',
] as const;

export const FORBIDDEN_FORM_BOUNDARY_FIELDS = [
  'applicationId',
  'caseId',
  'eligibilityStatus',
  'approvalStatus',
  'submittedAt',
] as const;
