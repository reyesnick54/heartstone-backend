export const CANNABIS_FOUNDATION_MODEL_NAMES = [
  'CannabisAdministrationConfiguration',
  'CannabisRegulatedEntityReference',
  'CannabisApplicationReference',
  'CannabisFacilitySiteReference',
  'CannabisResponsiblePartyReference',
  'CannabisBeneficialOwnershipReference',
  'CannabisConditionRecord',
  'CannabisLicenceRecord',
  'CannabisLicenceStatusHistory',
  'CannabisOperatingStatusHistory',
  'CannabisExternalDependency',
  'CannabisInspectionReference',
  'CannabisComplianceReference',
  'CannabisDataAccessAudit',
] as const;

export const CANNABIS_FOUNDATION_ENUM_NAMES = [
  'CannabisAdministrationActorPersona',
  'CannabisAdministrationDataClassification',
  'CannabisOperatingStatus',
  'CannabisDelegatedLicenceFunctionActivation',
  'CannabisServiceOperationalActivation',
  'CannabisLicenceLifecycleStatus',
  'CannabisExternalDependencyStatus',
  'CannabisExternalDependencyRecordedBy',
  'CannabisResponsiblePartyRole',
] as const;

export const FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS = [
  'lifecycleStatus',
  'officialInstrumentId',
  'governmentDecisionId',
  'licenceNumber',
  'issuedAt',
] as const;
