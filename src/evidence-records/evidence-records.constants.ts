export const NON_PRODUCTION_EVIDENCE_RECORDS_FIXTURE_MARKER =
  'NON_PRODUCTION_EVIDENCE_RECORDS_TEST_ONLY';

export const DOCUMENT_NUMBER_PREFIX = 'DOC';

export const DOCUMENT_STORAGE_PROVIDER_IN_MEMORY = 'in-memory';

export const DOCUMENT_INTEGRITY_DISCLAIMER =
  'SHA-256 integrity proves byte preservation only. It does not establish truth, authenticity, legal effect, professional correctness, or issuer authority.';

export const FORBIDDEN_PHASE_7C_MODELS = [
  'EvidenceVault',
  'EvidencePacket',
  'EvidenceItem',
] as const;

export const FORBIDDEN_CLIENT_DOCUMENT_FIELDS = [
  'storageObjectKey',
  'storageProvider',
  'storageVersionId',
  'sha256',
  'malwareScanStatus',
  'authenticityStatus',
  'signatureStatus',
  'sealStatus',
] as const;
