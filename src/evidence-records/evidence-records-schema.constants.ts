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
