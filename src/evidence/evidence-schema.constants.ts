export const EVIDENCE_MODEL_NAMES = [
  'MasterAdministrativeFile',
  'EvidenceRecord',
  'DocumentVersion',
  'EvidenceQualityAssessment',
  'EvidenceVerificationRecord',
  'EvidenceAcceptanceRecord',
  'DepartmentalEvidenceReview',
  'EvidenceGovernmentCommunication',
  'EvidenceProfessionalReview',
  'EvidenceInspectionRecord',
  'EvidenceSourceCitation',
  'EvidencePacket',
  'EvidencePacketVersion',
  'EvidencePacketItem',
  'EvidencePacketManifest',
  'EvidencePacketItemExclusion',
] as const;

export const EVIDENCE_PACKET_PURPOSES = [
  'SUBSTANTIVE_REVIEW',
  'PROFESSIONAL_REVIEW',
  'INSPECTION_REVIEW',
  'EXTERNAL_REFERRAL',
  'DECISION_SUPPORT',
  'APPEAL_RECORD',
  'COMPLIANCE_REVIEW',
  'PROJECT_READINESS',
  'OTHER_CONTROLLED_PURPOSE',
] as const;

export const EVIDENCE_PACKET_VERSION_STATUSES = [
  'DRAFT',
  'ASSEMBLED',
  'UNDER_REVIEW',
  'FROZEN',
  'SUPERSEDED',
  'ARCHIVED',
] as const;

export const FORBIDDEN_PACKET_VERSION_DECISION_FIELDS = [
  'approved',
  'refused',
  'decisionOutcome',
] as const;
