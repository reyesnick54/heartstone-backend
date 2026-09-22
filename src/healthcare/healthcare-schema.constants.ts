export const HEALTHCARE_REGISTRY_MODEL_NAMES = [
  'HealthcareOrganization',
  'HealthcareFacility',
  'HealthcareFacilityType',
  'HealthcareServiceLocation',
  'HealthcareAccreditation',
  'HealthcareFacilityLicense',
  'HealthcareRegulatoryStatus',
  'HealthcareRegistryEntry',
  'HealthcareRegistryVerification',
  'HealthcareRegistryStatusHistory',
] as const;

export const HEALTHCARE_PROFESSIONAL_MODEL_NAMES = [
  'HealthcareProfessional',
  'HealthcareProfessionalType',
  'HealthcareProfessionalLicense',
  'HealthcareProfessionalSpecialty',
  'HealthcareProfessionalCredentialReference',
  'HealthcareProfessionalStatusHistory',
] as const;

export const HEALTHCARE_PATIENT_MODEL_NAMES = [
  'PatientHealthIdentity',
  'PatientHealthcareRelationship',
  'HealthcareIdentifierReference',
] as const;

export const HEALTHCARE_PRIVACY_MODEL_NAMES = [
  'HealthcareJurisdictionPrivacyHook',
  'HealthcareDataAccessPolicy',
  'HealthcareDataAccessConsent',
  'HealthcareBreakGlassAccessSession',
  'HealthcareAccessAuditEvent',
] as const;

export const HEALTHCARE_MODEL_NAMES = [
  ...HEALTHCARE_REGISTRY_MODEL_NAMES,
  ...HEALTHCARE_PROFESSIONAL_MODEL_NAMES,
  ...HEALTHCARE_PATIENT_MODEL_NAMES,
  ...HEALTHCARE_PRIVACY_MODEL_NAMES,
] as const;

export const HEALTHCARE_ENUM_NAMES = [
  'HealthcareDataCategory',
  'HealthcareDataAccessPurpose',
  'HealthcareOrganizationStatus',
  'HealthcareProfessionalRecordStatus',
  'HealthcareLicenseStatus',
  'HealthcareRegistryEntryStatus',
  'HealthcareRegistryVerificationState',
  'HealthcareRegulatoryStatusKind',
  'HealthcarePatientRelationshipKind',
  'HealthcareBreakGlassSessionStatus',
  'HealthcareAccessAuditEventType',
  'HealthcareAccessDecision',
  'HealthcareAccreditationSubjectKind',
  'HealthcareRegistrySubjectKind',
] as const;
