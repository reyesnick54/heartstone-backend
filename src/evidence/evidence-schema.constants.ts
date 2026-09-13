export const EVIDENCE_MODEL_NAMES = [
  'EvidenceRecord',
  'EvidenceVerification',
  'EvidenceRequirementLink',
  'EvidencePurposeAcceptance',
  'EvidenceQualityAssessment',
] as const;

export const EVIDENCE_RECORD_STATUSES = [
  'REQUESTED',
  'RECEIVED',
  'UNREADABLE',
  'INCOMPLETE',
  'DUPLICATE',
  'APPLICANT_ASSERTED',
  'EXTERNALLY_ISSUED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'PARTIALLY_VERIFIED',
  'DISPUTED',
  'EXPIRED',
  'SUPERSEDED',
  'WITHDRAWN',
  'REJECTED_FOR_STATED_PURPOSE',
  'ACCEPTED_FOR_LIMITED_RELIANCE',
  'ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE',
] as const;

export const EVIDENCE_VERIFICATION_CATEGORIES = [
  'INTEGRITY',
  'ISSUER',
  'SIGNATURE',
  'SEAL',
  'IDENTITY',
  'DATE',
  'REGISTRY_MATCH',
  'CONTENT_FACT',
  'PROFESSIONAL',
  'OTHER_CONTROLLED_METHOD',
] as const;

export const EVIDENCE_ACCEPTANCE_PURPOSES = [
  'COMPLETENESS',
  'SUBSTANTIVE_REVIEW',
  'PROFESSIONAL_REVIEW',
  'INSPECTION',
  'EXTERNAL_REFERRAL',
  'FUTURE_DECISION_PACKET',
  'COMPLIANCE',
  'OTHER_APPROVED_PURPOSE',
] as const;

export const EVIDENCE_QUALITY_CRITERIA = [
  'RELEVANCE',
  'PROVENANCE',
  'AUTHENTICITY',
  'COMPLETENESS',
  'CURRENCY',
  'INDEPENDENCE',
  'RELIABILITY',
  'INTEGRITY',
  'SCOPE',
  'FITNESS_FOR_PURPOSE',
] as const;

export const PHASE_7D_ATTRIBUTABLE_MODEL_NAMES = [
  'DepartmentalReviewRecord',
  'DepartmentalReviewEvidence',
  'GovernmentCommunicationRecord',
  'GovernmentCommunicationDocument',
  'GovernmentCommunicationEvidence',
  'ProfessionalReviewRecord',
  'ProfessionalReviewEvidence',
  'InspectionRecord',
  'InspectionInspector',
  'InspectionEvidenceItem',
  'EvidenceCustodyEvent',
] as const;

export const GOVERNMENT_COMMUNICATION_CATEGORIES = [
  'RECEIPT',
  'ACKNOWLEDGMENT',
  'INFORMATION',
  'GUIDANCE',
  'CONSULTATION',
  'REQUEST',
  'RESPONSE',
  'CONCURRENCE',
  'OBJECTION',
  'RETAINED_DETERMINATION',
  'SUPERVISORY_FINDING',
  'INSPECTION_FINDING',
  'OTHER',
] as const;

export const INSPECTION_FINDING_CLASSIFICATIONS = [
  'OBSERVATION',
  'CONDITION',
  'NON_COMPLIANCE',
  'OTHER',
] as const;

export const EVIDENCE_PACKET_MODEL_NAMES = [
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
