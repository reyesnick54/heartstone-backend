export const DIGITAL_ASSETS_FOUNDATION_MODEL_NAMES = [
  'DigitalAssetsConfiguration',
  'DigitalAssetsRegulatedEntityReference',
  'DigitalAssetsApplicationReference',
  'DigitalAssetsTechnologyProfile',
  'DigitalAssetsResponsiblePartyReference',
  'DigitalAssetsBeneficialOwnershipReference',
  'DigitalAssetsConditionRecord',
  'DigitalAssetsOperatingStatusHistory',
  'DigitalAssetsAuthorizationRecord',
  'DigitalAssetsTechnicalReviewRecord',
  'DigitalAssetsExternalDependency',
  'DigitalAssetsComplianceReference',
  'DigitalAssetsDataAccessAudit',
] as const;

export const DIGITAL_ASSETS_FOUNDATION_ENUM_NAMES = [
  'DigitalAssetsActorPersona',
  'DigitalAssetsDataClassification',
  'DigitalAssetsOperatingStatus',
  'DigitalAssetsExternalDependencyType',
  'DigitalAssetsExternalDependencyRecordedBy',
  'DigitalAssetsExternalDependencyStatus',
  'DigitalAssetsTechnicalReviewCategory',
  'DigitalAssetsTechnicalReviewStatus',
  'DigitalAssetsAuthorizationStatus',
  'DigitalAssetsResponsiblePartyRole',
] as const;

export const FORBIDDEN_CLIENT_AUTHORIZATION_FIELDS = [
  'status',
  'officialInstrumentId',
  'governmentDecisionId',
  'issuedAt',
] as const;
