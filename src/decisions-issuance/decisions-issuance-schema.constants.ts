export const PHASE_8E_MODEL_NAMES = [
  'EvidencePacket',
  'EvidencePacketVersion',
  'DecisionType',
  'DecisionTypeVersion',
  'DecisionReadinessAssessment',
  'GovernmentDecision',
  'DecisionCondition',
  'InstrumentTypeDefinition',
  'InstrumentTypeVersion',
  'InstrumentTypeEligibleDecisionType',
  'InstrumentTemplate',
  'InstrumentTemplateVersion',
  'InstrumentNumberingRule',
  'InstrumentNumberReservation',
  'OfficialInstrument',
  'OfficialInstrumentVersion',
  'IssuanceReadinessAssessment',
  'IssuanceEvent',
] as const;

export const PHASE_8F_MODEL_NAMES = [
  'InstrumentDelivery',
  'InstrumentDeliveryAttempt',
  'InstrumentReceiptAcknowledgment',
  'InstrumentVerificationRecord',
  'InstrumentVerificationEvent',
  'InstrumentDeliveryAuditEvent',
  'InstrumentDownloadEvent',
] as const;

export const DECISIONS_ISSUANCE_MODEL_NAMES = [
  ...PHASE_8E_MODEL_NAMES,
  ...PHASE_8F_MODEL_NAMES,
] as const;

export const OFFICIAL_INSTRUMENT_KINDS = [
  'APPROVAL_NOTICE',
  'LICENSE',
  'PERMIT',
  'CERTIFICATE',
  'REGISTRATION',
  'AUTHORIZATION',
  'CONDITION_NOTICE',
  'SUSPENSION_NOTICE',
  'REVOCATION_NOTICE',
  'REINSTATEMENT_NOTICE',
  'AMENDED_INSTRUMENT',
  'REPLACEMENT_INSTRUMENT',
  'OFFICIAL_DECISION_NOTICE',
  'ACKNOWLEDGMENT',
  'OTHER_AUTHORIZED_INSTRUMENT',
] as const;

export const EVIDENCE_PACKET_VERSION_STATUSES = ['DRAFT', 'FROZEN', 'SUPERSEDED'] as const;

export const INSTRUMENT_DELIVERY_CHANNELS = [
  'PORTAL',
  'SECURE_EMAIL',
  'GOVERNMENT_INTEGRATION',
  'PARTNER_INTEGRATION',
  'CONTROLLED_DOWNLOAD',
  'PHYSICAL_OR_MANUAL_REFERENCE',
] as const;

export const INSTRUMENT_VERIFICATION_STATUSES = [
  'CURRENT',
  'NOT_YET_EFFECTIVE',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
  'SUPERSEDED',
  'REPLACED',
  'SURRENDERED',
  'UNKNOWN_OR_UNVERIFIABLE',
  'VALID_REFERENCE',
  'NOT_PUBLICLY_DISCLOSABLE',
] as const;

export const INSTRUMENT_DELIVERY_AUDIT_EVENT_TYPES = [
  'DELIVERY_PREPARED',
  'DELIVERY_SENT',
  'DELIVERY_DELIVERED',
  'DELIVERY_FAILED',
  'DELIVERY_REDELIVERY',
  'DOWNLOAD',
  'VERIFICATION_REQUEST',
  'RECEIPT_ACKNOWLEDGMENT',
] as const;
