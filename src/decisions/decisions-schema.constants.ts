export const DECISION_TYPE_LIFECYCLE_STATUSES = [
  'DRAFT',
  'AUTHORITY_REVIEW',
  'APPROVED',
  'CONFIGURED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED',
] as const;

export const DECISION_OUTCOME_CODES = [
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'PARTIALLY_APPROVED',
  'REFUSED',
  'DEFERRED',
  'RETURNED_FOR_FURTHER_INFORMATION',
  'WITHDRAWN',
  'LAPSED',
  'TRANSFERRED',
  'REFERRED_TO_OTHER_INSTITUTION',
  'CLOSED_WITHOUT_DECISION',
  'OTHER_AUTHORIZED_OUTCOME',
] as const;

export const DECISIONS_MODEL_NAMES = [
  'DecisionTypeDefinition',
  'DecisionTypeVersion',
  'DecisionPermissibleOutcomeDefinition',
  'DecisionTypePermissibleOutcome',
  'DecisionTypeRequirementElement',
  'DecisionTypeLifecycleTransition',
] as const;

export const FORBIDDEN_DECISION_CATALOG_FIELDS = [
  'decisionOutcome',
  'finalDecisionAt',
  'signedAt',
  'sealedAt',
  'issuedInstrumentId',
  'governmentDecisionId',
] as const;

export const PHASE_4_DECISION_REFERENCE_FIELDS = [
  'functionAuthorityRecordId',
  'requiredAuthorityAction',
  'governingSourceId',
] as const;

export const PHASE_7_DECISION_REFERENCE_FIELDS = [
  'requiredEvidencePacketPurpose',
  'requiresFrozenEvidencePacket',
  'requiresProfessionalReview',
  'requiresGovernmentConsultation',
] as const;
