import { type TechnicalAccessLevel } from '@prisma/client';

import { type PermissionCode, PermissionCodes } from '../constants/permission-codes.constants';

/**
 * Institution-configured / HeartStone access-level framework (Appendix I style mapping).
 * Levels describe configured technical permission bundles — not legal authority.
 */
export const ACCESS_LEVEL_LABELS: Record<
  TechnicalAccessLevel,
  { label: string; description: string }
> = {
  A: {
    label: 'Public / unauthenticated surface',
    description: 'No authenticated technical permissions; routes use explicit @Public().',
  },
  B: {
    label: 'Authenticated self-service',
    description: 'Citizen and holder self-service read surfaces.',
  },
  C: {
    label: 'Institutional read',
    description: 'Read-only institutional and government structure visibility.',
  },
  D: {
    label: 'Institutional operations',
    description: 'Scoped operational administration without platform configuration.',
  },
  E: {
    label: 'Platform configuration',
    description: 'Identity and government structure configuration capabilities.',
  },
  F: {
    label: 'Restricted platform security',
    description: 'Security, audit, and activation-class configuration.',
  },
};

const LEVEL_C: readonly PermissionCode[] = [
  PermissionCodes.IDENTITY_SELF_READ,
  PermissionCodes.GOVERNMENT_JURISDICTION_READ,
  PermissionCodes.GOVERNMENT_INSTITUTION_READ,
  PermissionCodes.IDENTITY_PERSON_READ,
  PermissionCodes.IDENTITY_USER_ACCOUNT_READ,
  PermissionCodes.IDENTITY_IDENTITY_READ,
  PermissionCodes.GOVERNMENT_STRUCTURE_READ,
  PermissionCodes.AUTHORITY_GOVERNING_SOURCE_READ,
  PermissionCodes.SERVICE_CATALOG_READ,
  PermissionCodes.RECORDS_RETENTION_SCHEDULE_READ,
  PermissionCodes.SERVICE_PACK_READ,
];

const LEVEL_D: readonly PermissionCode[] = [
  ...LEVEL_C,
  PermissionCodes.IDENTITY_MEMBERSHIP_READ,
  PermissionCodes.IDENTITY_ORGANIZATION_READ,
  PermissionCodes.AUTHORITY_EVALUATION_RUN,
  PermissionCodes.RECORDS_MASTER_FILE_READ,
  PermissionCodes.RECORDS_MASTER_FILE_MANAGE,
  PermissionCodes.REDRESS_MATTER_READ,
  PermissionCodes.REDRESS_MATTER_MANAGE,
  PermissionCodes.COMMUNICATIONS_MESSAGE_PREPARE,
  PermissionCodes.COMMUNICATIONS_MESSAGE_APPROVE,
  PermissionCodes.FINANCIAL_RECORD_READ,
  PermissionCodes.INTEGRATION_READ,
  PermissionCodes.INTEGRATION_EXCHANGE_EXECUTE,
  PermissionCodes.INTELLIGENCE_READ,
  PermissionCodes.INTELLIGENCE_ANALYSIS_RUN,
  PermissionCodes.INTELLIGENCE_CLAIM_REVIEW,
  PermissionCodes.INTELLIGENCE_COMMAND_CONSOLE_QUERY,
  PermissionCodes.INTELLIGENCE_STRATEGIC_PROJECT_MANAGE,
  PermissionCodes.AI_ASSISTANCE_USE,
  PermissionCodes.AI_ASSISTANCE_REVIEW,
  PermissionCodes.OPERATIONAL_READINESS_READ,
];

const LEVEL_E: readonly PermissionCode[] = [
  ...LEVEL_D,
  PermissionCodes.IDENTITY_PERSON_CREATE,
  PermissionCodes.IDENTITY_PERSON_UPDATE,
  PermissionCodes.IDENTITY_USER_ACCOUNT_CREATE,
  PermissionCodes.IDENTITY_USER_ACCOUNT_UPDATE,
  PermissionCodes.IDENTITY_USER_ACCOUNT_SUSPEND,
  PermissionCodes.IDENTITY_USER_ACCOUNT_ACTIVATE,
  PermissionCodes.IDENTITY_USER_ACCOUNT_REVOKE,
  PermissionCodes.IDENTITY_IDENTITY_CREATE,
  PermissionCodes.IDENTITY_IDENTITY_UPDATE,
  PermissionCodes.IDENTITY_CREDENTIAL_CREATE,
  PermissionCodes.IDENTITY_CREDENTIAL_UPDATE,
  PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_CREATE,
  PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_UPDATE,
  PermissionCodes.IDENTITY_ORGANIZATION_CREATE,
  PermissionCodes.IDENTITY_ORGANIZATION_UPDATE,
  PermissionCodes.IDENTITY_MEMBERSHIP_CREATE,
  PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE,
  PermissionCodes.IDENTITY_REPRESENTATIVE_AUTHORITY_CREATE,
  PermissionCodes.IDENTITY_REPRESENTATIVE_AUTHORITY_UPDATE,
  PermissionCodes.IDENTITY_OFFICEHOLDER_LINK_CREATE,
  PermissionCodes.GOVERNMENT_JURISDICTION_CREATE,
  PermissionCodes.GOVERNMENT_JURISDICTION_UPDATE,
  PermissionCodes.GOVERNMENT_INSTITUTION_CREATE,
  PermissionCodes.GOVERNMENT_INSTITUTION_UPDATE,
  PermissionCodes.GOVERNMENT_APPOINTMENT_CREATE,
  PermissionCodes.GOVERNMENT_APPOINTMENT_READ,
  PermissionCodes.GOVERNMENT_APPOINTMENT_UPDATE,
  PermissionCodes.GOVERNMENT_DELEGATION_CREATE,
  PermissionCodes.GOVERNMENT_DELEGATION_READ,
  PermissionCodes.GOVERNMENT_DELEGATION_UPDATE,
  PermissionCodes.AUTHORITY_FUNCTION_RECORD_CREATE,
  PermissionCodes.AUTHORITY_FUNCTION_RECORD_READ,
  PermissionCodes.WORKFLOW_DEFINITION_CREATE,
  PermissionCodes.IDENTITY_TECHNICAL_ACCESS_READ,
  PermissionCodes.IDENTITY_TECHNICAL_ACCESS_ROLE_ASSIGN,
  PermissionCodes.GOVERNMENT_STRUCTURE_MANAGE,
  PermissionCodes.AUTHORITY_GOVERNING_SOURCE_CREATE,
  PermissionCodes.SERVICE_CATALOG_MANAGE,
  PermissionCodes.SERVICE_CATALOG_FORM_PUBLISH,
  PermissionCodes.COMMUNICATIONS_TEMPLATE_MANAGE,
  PermissionCodes.RECORDS_CLASSIFICATION_MANAGE,
  PermissionCodes.RECORDS_RETENTION_SCHEDULE_MANAGE,
  PermissionCodes.RECORDS_LEGAL_HOLD_PLACE,
  PermissionCodes.RECORDS_DISPOSITION_REQUEST,
  PermissionCodes.INTEGRATION_MANAGE,
  PermissionCodes.OPERATIONAL_READINESS_MANAGE,
  PermissionCodes.SERVICE_PACK_MANAGE,
  PermissionCodes.INTELLIGENCE_CONFIGURATION_MANAGE,
  PermissionCodes.INTELLIGENCE_CONFIGURATION_PUBLISH,
];

/**
 * Level F holds assurance actions: changes that make something count as authoritative
 * (an authenticated governing source, an accepted integration, a recorded external
 * determination). These are never bundled into routine administrator roles.
 */
const LEVEL_F: readonly PermissionCode[] = [
  ...LEVEL_E,
  PermissionCodes.AUTHORITY_GOVERNING_SOURCE_AUTHENTICATE,
  PermissionCodes.AUTHORITY_GOVERNING_SOURCE_REVOKE,
  PermissionCodes.AUTHORITY_EXTERNAL_DETERMINATION_RECORD,
  PermissionCodes.AUTHORITY_INSTITUTIONAL_ACT_RECORD,
  PermissionCodes.REDRESS_DETERMINATION_RECORD,
  PermissionCodes.INTEGRATION_ACCEPT,
  PermissionCodes.INTELLIGENCE_CONSEQUENTIAL_USE_APPROVE,
  PermissionCodes.OPERATIONAL_READINESS_DECIDE,
  PermissionCodes.SERVICE_PACK_ACCEPT,
  PermissionCodes.AUTHORITY_FUNCTION_RECORD_ACTIVATE,
  PermissionCodes.WORKFLOW_DEFINITION_APPROVE,
  PermissionCodes.RECORDS_LEGAL_HOLD_RELEASE,
  PermissionCodes.CONFIGURATION_ACTIVATE,
  PermissionCodes.CONFIGURATION_CHANGE_PROPOSE,
  PermissionCodes.CONFIGURATION_CHANGE_APPROVE,
  PermissionCodes.AUDIT_READ,
];

export const ACCESS_LEVEL_PERMISSIONS: Record<TechnicalAccessLevel, readonly PermissionCode[]> = {
  A: [],
  B: [PermissionCodes.IDENTITY_SELF_READ],
  C: LEVEL_C,
  D: LEVEL_D,
  E: LEVEL_E,
  F: LEVEL_F,
};
