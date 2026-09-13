export const EVIDENCE_RECORDS_MODEL_NAMES = [
  'DocumentRecord',
  'DocumentVersion',
  'DocumentAssociation',
  'DocumentAuditEvent',
] as const;

export const EVIDENCE_RECORDS_ENUM_NAMES = [
  'DocumentSourceType',
  'DocumentSignatureStatus',
  'DocumentSealStatus',
  'DocumentAuthenticityStatus',
  'DocumentSecurityClassification',
  'DocumentPrivacyClassification',
  'DocumentConfidentialityOrPrivilegeStatus',
  'MalwareScanStatus',
  'DocumentAssociationTargetType',
  'DocumentAssociationRole',
  'DocumentAuditEventType',
] as const;

export const MASTER_FILE_COMPLETENESS_OUTCOMES = [
  'COMPLETE',
  'INCOMPLETE',
  'UNRESOLVED',
  'SAFE_HALTED',
] as const;

export const INTEGRITY_FAILURE_EVENT_TYPES = [
  'HASH_MISMATCH',
  'TAMPER_DETECTED',
  'SEAL_BROKEN',
  'INTEGRITY_COMPROMISED',
] as const;

export const FORBIDDEN_CLIENT_SETTABLE_EVIDENCE_FIELDS = [
  'status',
  'verifiedAt',
  'acceptedAt',
  'sealedAt',
  'contentHash',
  'manifestHash',
  'confidentialityClassification',
] as const;

export const FORBIDDEN_CLIENT_SETTABLE_MASTER_FILE_FIELDS = [
  'lifecycleStatus',
  'closedAt',
  'masterAdministrativeFileReference',
  'integrityStatus',
] as const;

export const RESTRICTED_EVIDENCE_CONFIDENTIALITY_CLASSIFICATIONS = [
  'RESTRICTED',
  'HIGHLY_RESTRICTED',
  'CONFIDENTIAL',
] as const;

export const MALWARE_SCAN_STATUSES = [
  'NOT_SCANNED',
  'SCAN_PENDING',
  'CLEAN',
  'SUSPICIOUS',
  'MALICIOUS',
  'SCAN_FAILED',
  'QUARANTINED',
] as const;

export const SECURITY_CLASSIFICATIONS = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
  'HIGHLY_RESTRICTED',
] as const;
