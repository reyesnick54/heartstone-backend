export const CIVIL_REGISTRY_VITAL_RECORD_MODEL_NAMES = [
  'CivilRegistryVitalRecord',
  'CivilRegistryVitalRecordVersion',
  'CivilRegistryEventSubmission',
  'CivilRegistryRecordEntitlement',
  'CivilRegistryCertificate',
  'CivilRegistryCertificateVerification',
] as const;

export const CIVIL_REGISTRY_FOUNDATION_MODEL_NAMES = [
  'CivilPersonRecord',
  'CivilIdentityRecord',
  'VitalEvent',
  'BirthEvent',
  'DeathEvent',
  'MarriageEvent',
  'DivorceEvent',
  'CivilStatusRecord',
  'CivilRecordAmendment',
  'CivilRecordCorrectionRequest',
  'CivilRecordRelationship',
  'CivilRegistryEntry',
  'CivilRegistryVersion',
  'CivilRegistrySourceReference',
  'CivilRegistryVerification',
  'CivilRegistryRestriction',
  'CivilRegistryAuditEvent',
  'CivilRegistryCertificateExtract',
  'VitalEventEvidenceLink',
] as const;

export const CIVIL_REGISTRY_MODEL_NAMES = [
  ...CIVIL_REGISTRY_VITAL_RECORD_MODEL_NAMES,
  ...CIVIL_REGISTRY_FOUNDATION_MODEL_NAMES,
] as const;

export const CIVIL_REGISTRY_VITAL_RECORD_ENUM_NAMES = [
  'CivilRegistryEventType',
  'CivilRegistryRecordStatus',
  'CivilRegistrySubmissionStatus',
  'CivilRegistryCertificateType',
  'CivilRegistryCertificateStatus',
  'CivilRegistryVerificationValidity',
] as const;

export const CIVIL_REGISTRY_ENUM_NAMES = [
  'CivilRegistryAccessClassification',
  'VitalEventType',
  'VitalEventRegistrationStatus',
  'CivilRegistryEntryStatus',
  'CivilRegistryVerificationState',
  'CivilRecordRelationshipRole',
  'CivilRecordAmendmentBasis',
  'CivilRecordCorrectionRequestStatus',
  'CivilRegistryAuditEventType',
  ...CIVIL_REGISTRY_VITAL_RECORD_ENUM_NAMES,
] as const;
