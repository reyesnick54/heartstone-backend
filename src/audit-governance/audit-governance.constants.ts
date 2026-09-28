export const AUDIT_LEDGER_HASH_ALGORITHM = 'SHA-256';

/**
 * Hash chains are independent per `ledgerStreamKey`. Institution-scoped government actions use
 * `institution:<institutionId>`. Platform-wide security events without an institution use `platform`.
 */
export const AUDIT_LEDGER_STREAM = {
  platform: 'platform',
  institution: (institutionId: string) => `institution:${institutionId}`,
} as const;

export const GOVERNMENT_AUDIT_EVENT_TYPES = {
  SECURITY_EVENT: 'SECURITY_EVENT',
  TECHNICAL_ACCESS: 'TECHNICAL_ACCESS',
  AUTHORITY_EVALUATION: 'AUTHORITY_EVALUATION',
  DECISION: 'DECISION',
  SIGNATURE: 'SIGNATURE',
  ISSUANCE: 'ISSUANCE',
  RECORD_CORRECTION: 'RECORD_CORRECTION',
  LEGAL_HOLD: 'LEGAL_HOLD',
  WORKFLOW_CONFIG_ACTIVATION: 'WORKFLOW_CONFIG_ACTIVATION',
  INTEGRATION_CHANGE: 'INTEGRATION_CHANGE',
  GOVERNED_CONFIGURATION: 'GOVERNED_CONFIGURATION',
  ADMINISTRATIVE_CHANGE: 'ADMINISTRATIVE_CHANGE',
  AI_CALL: 'AI_CALL',
} as const;

export const SENSITIVE_AUDIT_METADATA_KEY_PATTERN =
  /(password|secret|token|api[_-]?key|credential|private[_-]?key|authorization)/i;

export const AUDIT_GOVERNANCE_MODEL_NAMES = [
  'GovernmentAuditLedgerEntry',
  'GovernedConfigurationChange',
  'GovernedConfigurationEffectiveVersion',
] as const;

export const GOVERNMENT_AUDIT_EVENT_TYPE_VALUES = Object.values(GOVERNMENT_AUDIT_EVENT_TYPES);

export const PROTECTED_AUDIT_LEDGER_RELATIONS = [
  {
    model: 'GovernmentAuditLedgerEntry',
    field: 'institution',
    onDelete: 'Restrict',
  },
  {
    model: 'GovernmentAuditLedgerEntry',
    field: 'jurisdiction',
    onDelete: 'Restrict',
  },
  {
    model: 'GovernmentAuditLedgerEntry',
    field: 'actorIdentity',
    onDelete: 'Restrict',
  },
  {
    model: 'GovernmentAuditLedgerEntry',
    field: 'authorityEvaluationRecord',
    onDelete: 'Restrict',
  },
  {
    model: 'GovernedConfigurationChange',
    field: 'institution',
    onDelete: 'Restrict',
  },
  {
    model: 'GovernedConfigurationEffectiveVersion',
    field: 'change',
    onDelete: 'Restrict',
  },
] as const;
