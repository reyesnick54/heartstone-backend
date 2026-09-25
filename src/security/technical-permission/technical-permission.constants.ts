/** Canonical technical permission codes for restricted administrative HTTP routes. */
export const TECHNICAL_PERMISSION = {
  GOVERNMENT_STRUCTURE_ADMIN: 'government.structure.admin',
  IDENTITY_ADMIN: 'identity.admin',
  AUTHORITY_CONFIGURATION_ADMIN: 'authority.configuration.admin',
  SERVICE_CATALOG_ADMIN: 'service.catalog.admin',
  WORKFLOW_ADMIN: 'workflow.admin',
  SERVICE_PACKS_ADMIN: 'service.packs.admin',
  RECORDS_ADMIN: 'records.admin',
  EVIDENCE_RECORDS_ADMIN: 'evidence.records.admin',
  INTELLIGENCE_ADMIN: 'intelligence.admin',
  OPERATIONAL_SUPPORT_ADMIN: 'operational.support.admin',
  OPERATIONAL_READINESS_ADMIN: 'operational.readiness.admin',
  REDRESS_ADMIN: 'redress.admin',
  SCHEDULING_ADMIN: 'scheduling.admin',
  COMPLIANCE_ADMIN: 'compliance.admin',
} as const;

export type TechnicalPermissionCode =
  (typeof TECHNICAL_PERMISSION)[keyof typeof TECHNICAL_PERMISSION];

/** Grants issued to the integration test administrator persona. */
export const INTEGRATION_ADMIN_PERMISSION_CODES: TechnicalPermissionCode[] =
  Object.values(TECHNICAL_PERMISSION);
