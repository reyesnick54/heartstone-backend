/**
 * Canonical technical permission namespace: domain:resource:action
 * These codes confer software capability only — never legal or institutional authority.
 */
export const PermissionCodes = {
  IDENTITY_SELF_READ: 'identity:self:read',

  IDENTITY_PERSON_CREATE: 'identity:person:create',
  IDENTITY_PERSON_READ: 'identity:person:read',
  IDENTITY_PERSON_UPDATE: 'identity:person:update',

  IDENTITY_USER_ACCOUNT_CREATE: 'identity:user-account:create',
  IDENTITY_USER_ACCOUNT_READ: 'identity:user-account:read',
  IDENTITY_USER_ACCOUNT_UPDATE: 'identity:user-account:update',
  IDENTITY_USER_ACCOUNT_SUSPEND: 'identity:user-account:suspend',
  IDENTITY_USER_ACCOUNT_REVOKE: 'identity:user-account:revoke',
  IDENTITY_USER_ACCOUNT_ACTIVATE: 'identity:user-account:activate',

  IDENTITY_IDENTITY_CREATE: 'identity:identity:create',
  IDENTITY_IDENTITY_READ: 'identity:identity:read',
  IDENTITY_IDENTITY_UPDATE: 'identity:identity:update',

  IDENTITY_CREDENTIAL_CREATE: 'identity:credential:create',
  IDENTITY_CREDENTIAL_READ: 'identity:credential:read',
  IDENTITY_CREDENTIAL_UPDATE: 'identity:credential:update',

  IDENTITY_AUTHENTICATION_METHOD_CREATE: 'identity:authentication-method:create',
  IDENTITY_AUTHENTICATION_METHOD_READ: 'identity:authentication-method:read',
  IDENTITY_AUTHENTICATION_METHOD_UPDATE: 'identity:authentication-method:update',

  IDENTITY_ORGANIZATION_CREATE: 'identity:organization:create',
  IDENTITY_ORGANIZATION_READ: 'identity:organization:read',
  IDENTITY_ORGANIZATION_UPDATE: 'identity:organization:update',

  IDENTITY_MEMBERSHIP_CREATE: 'identity:membership:create',
  IDENTITY_MEMBERSHIP_READ: 'identity:membership:read',
  IDENTITY_MEMBERSHIP_UPDATE: 'identity:membership:update',

  IDENTITY_REPRESENTATIVE_AUTHORITY_CREATE: 'identity:representative-authority:create',
  IDENTITY_REPRESENTATIVE_AUTHORITY_READ: 'identity:representative-authority:read',
  IDENTITY_REPRESENTATIVE_AUTHORITY_UPDATE: 'identity:representative-authority:update',

  IDENTITY_OFFICEHOLDER_LINK_CREATE: 'identity:officeholder-link:create',
  IDENTITY_OFFICEHOLDER_LINK_READ: 'identity:officeholder-link:read',

  IDENTITY_TECHNICAL_ACCESS_ROLE_ASSIGN: 'identity:technical-access:role-assign',
  IDENTITY_TECHNICAL_ACCESS_READ: 'identity:technical-access:read',

  GOVERNMENT_JURISDICTION_CREATE: 'government:jurisdiction:create',
  GOVERNMENT_JURISDICTION_READ: 'government:jurisdiction:read',
  GOVERNMENT_JURISDICTION_UPDATE: 'government:jurisdiction:update',

  GOVERNMENT_INSTITUTION_CREATE: 'government:institution:create',
  GOVERNMENT_INSTITUTION_READ: 'government:institution:read',
  GOVERNMENT_INSTITUTION_UPDATE: 'government:institution:update',

  GOVERNMENT_APPOINTMENT_CREATE: 'government:appointment:create',
  GOVERNMENT_APPOINTMENT_READ: 'government:appointment:read',
  GOVERNMENT_APPOINTMENT_UPDATE: 'government:appointment:update',

  GOVERNMENT_DELEGATION_CREATE: 'government:delegation:create',
  GOVERNMENT_DELEGATION_READ: 'government:delegation:read',
  GOVERNMENT_DELEGATION_UPDATE: 'government:delegation:update',

  AUTHORITY_FUNCTION_RECORD_CREATE: 'authority:function-record:create',
  AUTHORITY_FUNCTION_RECORD_READ: 'authority:function-record:read',
  AUTHORITY_FUNCTION_RECORD_ACTIVATE: 'authority:function-record:activate',
  WORKFLOW_DEFINITION_CREATE: 'workflow:definition:create',
  WORKFLOW_DEFINITION_APPROVE: 'workflow:definition:approve',
  RECORDS_LEGAL_HOLD_RELEASE: 'records:legal-hold:release',
  CONFIGURATION_ACTIVATE: 'configuration:activate',
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

export const ALL_PERMISSION_DEFINITIONS: readonly {
  code: PermissionCode;
  description: string;
  domain: string;
}[] = Object.values(PermissionCodes).map((code) => {
  const [domain] = code.split(':');
  return {
    code,
    description: `Technical permission ${code}`,
    domain: domain ?? 'platform',
  };
});
