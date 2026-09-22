export const CIVIL_REGISTRY_MODEL_NAMES = [
  'CivilRegistryVitalRecord',
  'CivilRegistryVitalRecordVersion',
  'CivilRegistryEventSubmission',
  'CivilRegistryRecordEntitlement',
  'CivilRegistryCertificate',
  'CivilRegistryCertificateVerification',
] as const;

export const CIVIL_REGISTRY_EVENT_TYPES = [
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'DIVORCE',
  'CIVIL_STATUS_CHANGE',
  'LEGAL_NAME_CHANGE',
] as const;

export const CIVIL_REGISTRY_RECORD_STATUSES = [
  'SUBMISSION_PENDING',
  'OFFICIAL',
  'CORRECTED',
  'SEALED',
  'RESTRICTED',
] as const;

export const CIVIL_REGISTRY_SUBMISSION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'DECISION_PENDING',
  'REGISTERED',
  'REJECTED',
] as const;
