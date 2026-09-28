export const CARBON_MANAGEMENT_FOUNDATION_MODEL_NAMES = [
  'CarbonManagementConfiguration',
  'CarbonProgrammeReference',
  'CarbonProjectReference',
  'CarbonApplicationReference',
  'CarbonRegistryReference',
  'CarbonExternalVerificationRecord',
  'CarbonProjectStatusHistory',
  'CarbonAdministrativeAuthorizationRecord',
  'CarbonComplianceReference',
  'CarbonDataAccessAudit',
] as const;

export const CARBON_MANAGEMENT_FOUNDATION_ENUM_NAMES = [
  'CarbonManagementActorPersona',
  'CarbonManagementDataClassification',
  'CarbonProgrammeStatus',
  'CarbonProjectStatus',
  'CarbonExternalVerificationCategory',
  'CarbonExternalVerificationStatus',
  'CarbonExternalVerificationRecordedBy',
  'CarbonAdministrativeAuthorizationStatus',
  'CarbonRegistryReferenceStatus',
] as const;

export const FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS = [
  'status',
  'officialInstrumentId',
  'governmentDecisionId',
  'issuedAt',
] as const;
