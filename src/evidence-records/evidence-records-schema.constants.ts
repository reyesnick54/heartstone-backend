export const EVIDENCE_RECORDS_MODEL_NAMES = [
  'MasterAdministrativeFile',
  'MasterAdministrativeFileSection',
  'DocumentRecord',
  'DocumentVersion',
  'DocumentAssociation',
  'EvidenceRecord',
  'EvidenceVerification',
  'EvidenceRequirementLink',
  'EvidencePurposeAcceptance',
  'EvidenceQualityAssessment',
  'DepartmentalReviewRecord',
  'GovernmentCommunicationRecord',
  'ProfessionalReviewRecord',
  'InspectionRecord',
  'InspectionEvidenceItem',
  'EvidenceCustodyEvent',
  'EvidencePacket',
  'EvidencePacketVersion',
  'EvidencePacketItem',
  'EvidencePacketManifest',
  'RecordCorrection',
  'RecordIntegrityEvent',
  'RecordAccessEvent',
  'RetentionSchedule',
  'RetentionRule',
  'RecordRetentionAssignment',
  'LegalHold',
  'LegalHoldTarget',
  'PreservationCollection',
  'ArchivalTransfer',
  'RecordDispositionRequest',
  'RecordDispositionRecord',
] as const;

export const EVIDENCE_STATUSES = [
  'RECEIVED',
  'VERIFIED',
  'ACCEPTED',
  'DISPUTED',
  'WITHDRAWN',
  'SUPERSEDED',
  'EXPIRED',
  'QUARANTINED',
] as const;

export const EVIDENCE_VERIFICATION_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'VERIFIED',
  'REJECTED',
  'DISPUTED',
  'SUPERSEDED',
] as const;

export const EVIDENCE_PURPOSE_TYPES = [
  'IDENTITY_VERIFICATION',
  'ELIGIBILITY_SUPPORT',
  'TECHNICAL_COMPLIANCE',
  'PROFESSIONAL_ATTESTATION',
  'INSPECTION_RESULT',
  'DECISION_SUPPORT',
  'COMMUNICATION_RECORD',
  'OTHER',
] as const;

export const MASTER_FILE_COMPLETENESS_OUTCOMES = [
  'COMPLETE',
  'INCOMPLETE',
  'UNRESOLVED',
  'SAFE_HALTED',
] as const;

export const EVIDENCE_PACKET_STATUS_VALUES = [
  'DRAFT',
  'ASSEMBLED',
  'SEALED',
  'TRANSMITTED',
  'ARCHIVED',
] as const;

export const FORBIDDEN_EVIDENCE_BOUNDARY_FIELDS = [
  'isAuthentic',
  'isVerified',
  'isAccepted',
  'decisionOutcome',
  'issuedLicenseId',
  'issuedPermitId',
] as const;

export const FORBIDDEN_PHASE_8_MODELS = [
  'GovernmentDecision',
  'IssuedLicense',
  'IssuedPermit',
  'IssuedCertificate',
  'DecisionInstrument',
  'InstrumentIssuanceRecord',
] as const;

export const FORBIDDEN_CLIENT_SETTABLE_EVIDENCE_FIELDS = [
  'status',
  'verifiedAt',
  'acceptedAt',
  'sealedAt',
  'contentHash',
  'manifestHash',
  'classification',
] as const;

export const FORBIDDEN_CLIENT_SETTABLE_MASTER_FILE_FIELDS = [
  'status',
  'closedAt',
  'masterAdministrativeFileReference',
  'evidencePacketReference',
] as const;

export const PHASE_7_BOUNDARY_DISCLAIMER =
  'Phase 7 manages master administrative files, evidence, and records. It does not make final government decisions or issue instruments.';
