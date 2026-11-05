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

  /** Government structure beyond jurisdictions/institutions (bodies, departments, offices, officeholders, external authorities). */
  GOVERNMENT_STRUCTURE_READ: 'government:structure:read',
  GOVERNMENT_STRUCTURE_MANAGE: 'government:structure:manage',

  AUTHORITY_GOVERNING_SOURCE_READ: 'authority:governing-source:read',
  AUTHORITY_GOVERNING_SOURCE_CREATE: 'authority:governing-source:create',
  /** Records that an authenticated copy of a governing instrument was verified. Level F. */
  AUTHORITY_GOVERNING_SOURCE_AUTHENTICATE: 'authority:governing-source:authenticate',
  AUTHORITY_GOVERNING_SOURCE_REVOKE: 'authority:governing-source:revoke',
  AUTHORITY_EXTERNAL_DETERMINATION_RECORD: 'authority:external-determination:record',
  AUTHORITY_INSTITUTIONAL_ACT_RECORD: 'authority:institutional-act:record',
  AUTHORITY_EVALUATION_RUN: 'authority:evaluation:run',

  SERVICE_CATALOG_READ: 'service-catalog:configuration:read',
  SERVICE_CATALOG_MANAGE: 'service-catalog:configuration:manage',
  SERVICE_CATALOG_FORM_PUBLISH: 'service-catalog:form:publish',

  RECORDS_CLASSIFICATION_MANAGE: 'records:classification:manage',
  RECORDS_RETENTION_SCHEDULE_READ: 'records:retention-schedule:read',
  RECORDS_RETENTION_SCHEDULE_MANAGE: 'records:retention-schedule:manage',
  RECORDS_LEGAL_HOLD_PLACE: 'records:legal-hold:place',
  RECORDS_DISPOSITION_REQUEST: 'records:disposition:request',

  RECORDS_MASTER_FILE_READ: 'records:master-file:read',
  RECORDS_MASTER_FILE_MANAGE: 'records:master-file:manage',

  REDRESS_MATTER_READ: 'redress:matter:read',
  REDRESS_MATTER_MANAGE: 'redress:matter:manage',
  REDRESS_DETERMINATION_RECORD: 'redress:determination:record',

  COMMUNICATIONS_MESSAGE_PREPARE: 'communications:message:prepare',
  COMMUNICATIONS_MESSAGE_APPROVE: 'communications:message:approve',
  COMMUNICATIONS_TEMPLATE_MANAGE: 'communications:template:manage',

  FINANCIAL_RECORD_READ: 'financial:record:read',
  /** Machine permission for payment-provider callbacks; never granted to people. */
  FINANCIAL_PAYMENT_WEBHOOK_INGEST: 'financial:payment-webhook:ingest',

  INTEGRATION_READ: 'integration:definition:read',
  INTEGRATION_MANAGE: 'integration:definition:manage',
  INTEGRATION_ACCEPT: 'integration:definition:accept',
  INTEGRATION_EXCHANGE_EXECUTE: 'integration:exchange:execute',

  INTELLIGENCE_READ: 'intelligence:record:read',
  INTELLIGENCE_ANALYSIS_RUN: 'intelligence:analysis:run',
  INTELLIGENCE_CONFIGURATION_MANAGE: 'intelligence:configuration:manage',
  INTELLIGENCE_CONFIGURATION_PUBLISH: 'intelligence:configuration:publish',
  INTELLIGENCE_CLAIM_REVIEW: 'intelligence:claim:review',
  INTELLIGENCE_CONSEQUENTIAL_USE_APPROVE: 'intelligence:consequential-use:approve',
  INTELLIGENCE_COMMAND_CONSOLE_QUERY: 'intelligence:command-console:query',
  INTELLIGENCE_STRATEGIC_PROJECT_MANAGE: 'intelligence:strategic-project:manage',

  OPERATIONAL_READINESS_READ: 'operational-readiness:record:read',
  OPERATIONAL_READINESS_MANAGE: 'operational-readiness:record:manage',
  /** Records a maturity decision; level F. */
  OPERATIONAL_READINESS_DECIDE: 'operational-readiness:maturity:decide',

  SERVICE_PACK_READ: 'service-pack:registry:read',
  SERVICE_PACK_MANAGE: 'service-pack:authoring:manage',
  /** Accepts or rejects a service pack for use; level F. */
  SERVICE_PACK_ACCEPT: 'service-pack:governance:accept',

  AI_ASSISTANCE_USE: 'ai:assistance:use',
  AI_ASSISTANCE_REVIEW: 'ai:assistance:review',

  WORKFLOW_DEFINITION_CREATE: 'workflow:definition:create',
  WORKFLOW_DEFINITION_APPROVE: 'workflow:definition:approve',
  RECORDS_LEGAL_HOLD_RELEASE: 'records:legal-hold:release',
  CONFIGURATION_ACTIVATE: 'configuration:change:activate',
  CONFIGURATION_CHANGE_PROPOSE: 'configuration:change:propose',
  CONFIGURATION_CHANGE_APPROVE: 'configuration:change:approve',
  AUDIT_READ: 'audit:ledger:read',
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
