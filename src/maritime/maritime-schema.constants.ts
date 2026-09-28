export const MARITIME_FOUNDATION_MODEL_NAMES = [
  'MaritimeConfiguration',
  'VesselRecord',
  'VesselOfficialRegistrationReference',
  'VesselProvenanceRecord',
  'VesselPartyRelationship',
  'VesselStatusHistory',
  'MaritimeApplicationReference',
  'MaritimeExternalDependency',
  'MaritimeAdministrativeInstrument',
  'MaritimeVesselInspectionReference',
  'MaritimeCustomsCaseReference',
  'MaritimeComplianceReference',
  'MaritimeDataAccessAudit',
] as const;

export const MARITIME_FOUNDATION_ENUM_NAMES = [
  'MaritimeActorPersona',
  'MaritimeDataClassification',
  'VesselAdministrativeStatus',
  'VesselPartyType',
  'VesselPartyRelationshipStatus',
  'MaritimeExternalDependencyType',
  'MaritimeExternalDependencyStatus',
  'MaritimeExternalDependencyRecordedBy',
  'MaritimeAdministrativeInstrumentStatus',
  'VesselProvenanceKind',
] as const;

export const FORBIDDEN_CLIENT_INSTRUMENT_FIELDS = [
  'status',
  'officialInstrumentId',
  'governmentDecisionId',
  'issuedAt',
  'maritimeApprovalAuthorizesCustomsRelease',
] as const;

export const FORBIDDEN_EMBEDDED_NATIONAL_MARITIME_TERMS = [
  'antigua',
  'barbuda',
  'absez flag',
  'port authority act',
] as const;
