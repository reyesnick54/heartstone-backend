import { TechnicalAccessLevel } from '@prisma/client';

import { PermissionCodes } from '../constants/permission-codes.constants';

/** System role codes — assign to identities; never hardcode individual people. */
export const TechnicalRoleCodes = {
  IDENTITY_PLATFORM_ADMINISTRATOR: 'identity-platform-administrator',
  GOVERNMENT_STRUCTURE_ADMINISTRATOR: 'government-structure-administrator',
  INSTITUTION_SCOPED_OPERATOR: 'institution-scoped-operator',
  AUTHORITY_ASSURANCE_OFFICER: 'authority-assurance-officer',
  SERVICE_CATALOG_ADMINISTRATOR: 'service-catalog-administrator',
  INSTITUTIONAL_CASE_OFFICER: 'institutional-case-officer',
  INTELLIGENCE_ANALYST: 'intelligence-analyst',
  INTEGRATION_ADMINISTRATOR: 'integration-administrator',
  PAYMENT_PROVIDER_CALLBACK: 'payment-provider-callback',
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
      PermissionCodes.GOVERNMENT_APPOINTMENT_CREATE,
      PermissionCodes.GOVERNMENT_APPOINTMENT_READ,
      PermissionCodes.GOVERNMENT_APPOINTMENT_UPDATE,
      PermissionCodes.GOVERNMENT_DELEGATION_CREATE,
      PermissionCodes.GOVERNMENT_DELEGATION_READ,
      PermissionCodes.GOVERNMENT_DELEGATION_UPDATE,
      PermissionCodes.AUTHORITY_FUNCTION_RECORD_CREATE,
      PermissionCodes.AUTHORITY_FUNCTION_RECORD_READ,
      PermissionCodes.WORKFLOW_DEFINITION_CREATE,
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
  {
    code: TechnicalRoleCodes.AUTHORITY_ASSURANCE_OFFICER,
    name: 'Authority assurance officer',
    description:
      'Records that governing instruments and external determinations have been verified. ' +
      'Technical capability only: holding this role does not confer legal authority.',
    permissionCodes: [
      PermissionCodes.AUTHORITY_GOVERNING_SOURCE_READ,
      PermissionCodes.AUTHORITY_GOVERNING_SOURCE_AUTHENTICATE,
      PermissionCodes.AUTHORITY_GOVERNING_SOURCE_REVOKE,
      PermissionCodes.AUTHORITY_EXTERNAL_DETERMINATION_RECORD,
      PermissionCodes.AUTHORITY_INSTITUTIONAL_ACT_RECORD,
      PermissionCodes.AUTHORITY_FUNCTION_RECORD_READ,
    ],
  },
  {
    code: TechnicalRoleCodes.SERVICE_CATALOG_ADMINISTRATOR,
    name: 'Service catalogue administrator',
    description: 'Configures government services, versions and forms.',
    permissionCodes: [
      PermissionCodes.SERVICE_CATALOG_READ,
      PermissionCodes.SERVICE_CATALOG_MANAGE,
      PermissionCodes.SERVICE_CATALOG_FORM_PUBLISH,
      PermissionCodes.GOVERNMENT_STRUCTURE_READ,
    ],
  },
  {
    code: TechnicalRoleCodes.INSTITUTIONAL_CASE_OFFICER,
    name: 'Institutional case officer',
    description:
      'Works cases inside an institution: administrative files, redress matters, ' +
      'communications and authority evaluation. Assign with institution scope.',
    accessLevel: TechnicalAccessLevel.D,
    permissionCodes: [],
  },
  {
    code: TechnicalRoleCodes.INTELLIGENCE_ANALYST,
    name: 'Intelligence analyst',
    description: 'Runs analysis and reviews intelligence claims; cannot approve consequential use.',
    permissionCodes: [
      PermissionCodes.INTELLIGENCE_READ,
      PermissionCodes.INTELLIGENCE_ANALYSIS_RUN,
      PermissionCodes.INTELLIGENCE_CLAIM_REVIEW,
      PermissionCodes.INTELLIGENCE_COMMAND_CONSOLE_QUERY,
      PermissionCodes.AI_ASSISTANCE_USE,
    ],
  },
  {
    code: TechnicalRoleCodes.INTEGRATION_ADMINISTRATOR,
    name: 'Integration administrator',
    description: 'Defines and operates external integrations; acceptance stays at level F.',
    permissionCodes: [
      PermissionCodes.INTEGRATION_READ,
      PermissionCodes.INTEGRATION_MANAGE,
      PermissionCodes.INTEGRATION_EXCHANGE_EXECUTE,
    ],
  },
  {
    code: TechnicalRoleCodes.PAYMENT_PROVIDER_CALLBACK,
    name: 'Payment provider callback',
    description: 'Assigned only to the payment provider service identity.',
    permissionCodes: [PermissionCodes.FINANCIAL_PAYMENT_WEBHOOK_INGEST],
  },
];
