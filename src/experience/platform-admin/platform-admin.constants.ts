export const PLATFORM_ADMIN_EXPERIENCE_API_TAG = 'Platform Admin Experience';

export const PLATFORM_ADMINISTRATIVE_PERMISSION_CODE = 'PLATFORM_ADMINISTRATIVE_ACCESS';

export const PLATFORM_ADMIN_AUTHORITY_DISCLAIMER =
  'Platform administrative access permits technical configuration visibility and governed configuration workflows. It does not confer decision authority, approval authority, legal authority, or institutional officeholding.';

export const PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER =
  'Administrative action metadata describes configuration pathways only. Consequential government actions require separate authority evaluation and cannot be executed through generic platform administration endpoints.';

export const PLATFORM_ADMIN_ACTION_KEYS = {
  CONFIGURE_SERVICE: 'configure-service',
  CREATE_DRAFT_SERVICE_VERSION: 'create-draft-service-version',
  CONFIGURE_FORM: 'configure-form',
  CONFIGURE_WORKFLOW: 'configure-workflow',
  REGISTER_INTEGRATION: 'register-integration',
  CONFIGURE_COMMUNICATIONS_TEMPLATE: 'configure-communications-template',
  SUBMIT_SERVICE_FOR_ACCEPTANCE: 'submit-service-for-acceptance',
  REQUEST_ACTIVATION: 'request-activation',
  SUSPEND_CONFIGURATION: 'suspend-configuration',
} as const;

export const PLATFORM_ADMIN_EXPLANATION_CODES = {
  ACCESS_DOES_NOT_GRANT_AUTHORITY: 'PLATFORM_ADMIN_ACCESS_DOES_NOT_GRANT_AUTHORITY',
  CANNOT_APPROVE_CASE: 'PLATFORM_ADMIN_CANNOT_APPROVE_CASE',
  CANNOT_CREATE_INSTITUTIONAL_AUTHORITY: 'PLATFORM_ADMIN_CANNOT_CREATE_INSTITUTIONAL_AUTHORITY',
  CANNOT_BYPASS_SERVICE_ACTIVATION: 'PLATFORM_ADMIN_CANNOT_BYPASS_SERVICE_ACTIVATION',
  CANNOT_ALTER_FINAL_DECISION: 'PLATFORM_ADMIN_CANNOT_ALTER_FINAL_DECISION',
  CANNOT_BYPASS_LEGAL_HOLD: 'PLATFORM_ADMIN_CANNOT_BYPASS_LEGAL_HOLD',
  CANNOT_ACTIVATE_AI_OUTSIDE_LIFECYCLE: 'PLATFORM_ADMIN_CANNOT_ACTIVATE_AI_OUTSIDE_LIFECYCLE',
  VISIBILITY_NOT_SUBSTANTIVE_ACCESS: 'PLATFORM_ADMIN_VISIBILITY_NOT_SUBSTANTIVE_ACCESS',
} as const;
