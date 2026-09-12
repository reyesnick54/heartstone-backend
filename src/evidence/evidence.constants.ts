export const EVIDENCE_SYSTEM_COMPONENT = 'heartstone-evidence-records';

export const MATERIAL_RECORD_TYPES = [
  'EvidenceDocumentVersion',
  'EvidenceItem',
  'EvidencePacketVersion',
  'MasterAdministrativeFileVersion',
] as const;

export type MaterialRecordType = (typeof MATERIAL_RECORD_TYPES)[number];

export const AI_ACTOR_IDENTITY_PREFIX = 'ai-assistant:';
