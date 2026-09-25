import { TechnicalAccessLevel } from '@prisma/client';

import { PermissionCodes } from '../constants/permission-codes.constants';

/** System role codes — assign to identities; never hardcode individual people. */
export const TechnicalRoleCodes = {
  IDENTITY_PLATFORM_ADMINISTRATOR: 'identity-platform-administrator',
  GOVERNMENT_STRUCTURE_ADMINISTRATOR: 'government-structure-administrator',
  INSTITUTION_SCOPED_OPERATOR: 'institution-scoped-operator',
} as const;

export interface BootstrapRoleDefinition {
  code: string;
  name: string;
  description: string;
  accessLevel?: TechnicalAccessLevel;
  permissionCodes: readonly string[];
}

export const BOOTSTRAP_TECHNICAL_ROLES: readonly BootstrapRoleDefinition[] = [
  {
    code: TechnicalRoleCodes.IDENTITY_PLATFORM_ADMINISTRATOR,
    name: 'Identity platform administrator',
    description: 'Platform-scoped identity provisioning and technical access administration.',
    accessLevel: TechnicalAccessLevel.E,
    permissionCodes: [
      PermissionCodes.IDENTITY_PERSON_CREATE,
      PermissionCodes.IDENTITY_PERSON_READ,
      PermissionCodes.IDENTITY_PERSON_UPDATE,
      PermissionCodes.IDENTITY_USER_ACCOUNT_CREATE,
      PermissionCodes.IDENTITY_USER_ACCOUNT_READ,
      PermissionCodes.IDENTITY_USER_ACCOUNT_UPDATE,
      PermissionCodes.IDENTITY_USER_ACCOUNT_SUSPEND,
      PermissionCodes.IDENTITY_USER_ACCOUNT_ACTIVATE,
      PermissionCodes.IDENTITY_USER_ACCOUNT_REVOKE,
      PermissionCodes.IDENTITY_IDENTITY_CREATE,
      PermissionCodes.IDENTITY_IDENTITY_READ,
      PermissionCodes.IDENTITY_IDENTITY_UPDATE,
      PermissionCodes.IDENTITY_CREDENTIAL_CREATE,
      PermissionCodes.IDENTITY_CREDENTIAL_READ,
      PermissionCodes.IDENTITY_CREDENTIAL_UPDATE,
      PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_CREATE,
      PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_READ,
      PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_UPDATE,
      PermissionCodes.IDENTITY_ORGANIZATION_CREATE,
      PermissionCodes.IDENTITY_ORGANIZATION_READ,
      PermissionCodes.IDENTITY_ORGANIZATION_UPDATE,
      PermissionCodes.IDENTITY_MEMBERSHIP_CREATE,
      PermissionCodes.IDENTITY_MEMBERSHIP_READ,
      PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE,
      PermissionCodes.IDENTITY_REPRESENTATIVE_AUTHORITY_CREATE,
      PermissionCodes.IDENTITY_REPRESENTATIVE_AUTHORITY_READ,
      PermissionCodes.IDENTITY_REPRESENTATIVE_AUTHORITY_UPDATE,
      PermissionCodes.IDENTITY_OFFICEHOLDER_LINK_CREATE,
      PermissionCodes.IDENTITY_OFFICEHOLDER_LINK_READ,
      PermissionCodes.IDENTITY_TECHNICAL_ACCESS_READ,
      PermissionCodes.IDENTITY_TECHNICAL_ACCESS_ROLE_ASSIGN,
    ],
  },
  {
    code: TechnicalRoleCodes.GOVERNMENT_STRUCTURE_ADMINISTRATOR,
    name: 'Government structure administrator',
    description: 'Platform-scoped government structure configuration.',
    accessLevel: TechnicalAccessLevel.E,
    permissionCodes: [
      PermissionCodes.GOVERNMENT_JURISDICTION_CREATE,
      PermissionCodes.GOVERNMENT_JURISDICTION_READ,
      PermissionCodes.GOVERNMENT_JURISDICTION_UPDATE,
      PermissionCodes.GOVERNMENT_INSTITUTION_CREATE,
      PermissionCodes.GOVERNMENT_INSTITUTION_READ,
      PermissionCodes.GOVERNMENT_INSTITUTION_UPDATE,
    ],
  },
  {
    code: TechnicalRoleCodes.INSTITUTION_SCOPED_OPERATOR,
    name: 'Institution-scoped operator',
    description: 'Institution-scoped institution update only (scope enforced on assignment).',
    accessLevel: TechnicalAccessLevel.D,
    permissionCodes: [
      PermissionCodes.GOVERNMENT_INSTITUTION_READ,
      PermissionCodes.GOVERNMENT_INSTITUTION_UPDATE,
    ],
  },
];
