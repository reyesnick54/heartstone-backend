export const SERVICE_PACK_VALIDATION_MODEL_NAMES = [
  'ServicePackComponent',
  'ServicePackDependency',
  'ServicePackValidationResult',
  'ServicePackImport',
] as const;

export const SERVICE_PACK_VALIDATION_ENUM_NAMES = [
  'ServicePackManifestValidationStatus',
  'ServicePackComponentKind',
  'ServicePackDependencyKind',
  'ServicePackDependencyControlScope',
  'ServicePackValidationOutcome',
  'ServicePackImportStatus',
] as const;

export const FORBIDDEN_SERVICE_PACK_AUTHORITY_FIELDS = [
  'classification',
  'functionClass',
  'lifecycleStatus',
  'governingSourceId',
  'authorityAction',
  'permitted',
  'isValid',
  'authorityValid',
  'automaticallyValid',
] as const;
