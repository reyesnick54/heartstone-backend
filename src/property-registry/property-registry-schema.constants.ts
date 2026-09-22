export const PHASE_PROPERTY_REGISTRY_MODEL_NAMES = [
  'PropertyRegistryConfiguration',
  'PropertyParcel',
  'PropertyInterest',
  'PropertyOwnershipHistory',
  'PropertyRegistryApplication',
  'PropertyTransferDecision',
  'PropertyEncumbrance',
  'PropertyEncumbranceHistory',
  'PropertySurveySubmission',
  'PropertyRegistryCertificate',
  'PropertyInterestEntitlement',
  'PropertyAccessAudit',
] as const;

export const PHASE_PROPERTY_REGISTRY_ENUM_NAMES = [
  'PropertyPublicVerificationMode',
  'PropertyParcelStatus',
  'PropertyInterestKind',
  'PropertyInterestStatus',
  'PropertyRegistryApplicationType',
  'PropertyRegistryApplicationStatus',
  'PropertyTransferDecisionOutcome',
  'PropertyEncumbranceKind',
  'PropertyEncumbranceStatus',
  'PropertySurveySubmissionStatus',
  'PropertyCertificateStatus',
  'PropertyAccessActorKind',
] as const;

export const FORBIDDEN_PROPERTY_CLIENT_FIELDS = [
  'registryVersion',
  'internalParcelIdentifier',
  'sealedDataReference',
  'mayMutateTitle',
] as const;
