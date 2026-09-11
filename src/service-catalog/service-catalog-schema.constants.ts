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
  'GovernmentService',
  'GovernmentServiceVersion',
  'FormDefinition',
  'FormVersion',
  'FormSection',
  'FormField',
  'FormFieldConditionalRule',
] as const;

export const FORBIDDEN_FORM_BOUNDARY_FIELDS = [
  'applicationId',
  'caseId',
  'eligibilityStatus',
  'approvalStatus',
  'submittedAt',
] as const;
