import { type TechnicalAccessLevel } from '@prisma/client';

import { type PermissionCode,PermissionCodes } from '../constants/permission-codes.constants';

/**
 * ABSEZ / HeartStone access-level framework (Appendix I style mapping).
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
];

const LEVEL_D: readonly PermissionCode[] = [
  ...LEVEL_C,
  PermissionCodes.IDENTITY_MEMBERSHIP_READ,
  PermissionCodes.IDENTITY_ORGANIZATION_READ,
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
  PermissionCodes.IDENTITY_TECHNICAL_ACCESS_READ,
  PermissionCodes.IDENTITY_TECHNICAL_ACCESS_ROLE_ASSIGN,
];

const LEVEL_F: readonly PermissionCode[] = [
  ...LEVEL_E,
  PermissionCodes.AUTHORITY_FUNCTION_RECORD_ACTIVATE,
  PermissionCodes.WORKFLOW_DEFINITION_APPROVE,
  PermissionCodes.RECORDS_LEGAL_HOLD_RELEASE,
  PermissionCodes.CONFIGURATION_ACTIVATE,
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
