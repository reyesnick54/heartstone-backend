export const HEALTHCARE_EXPERIENCE_DISCLAIMER =
  'Healthcare experience projections coordinate access and administration. They do not diagnose, prescribe, or determine medical treatment.';

export const FORBIDDEN_AI_CLINICAL_ACTIONS = [
  'FINALIZE_CLINICAL_SUITABILITY',
  'DETERMINE_CLINICAL_ELIGIBILITY',
  'PRESCRIBE_TREATMENT',
  'DIAGNOSE',
] as const;

export const FORBIDDEN_PLATFORM_ADMIN_CLINICAL_ACTIONS = [
  'FINALIZE_CLINICAL_SUITABILITY',
  'DETERMINE_CLINICAL_ELIGIBILITY',
] as const;

export const FORBIDDEN_CITIZEN_CLINICAL_NOTE_FIELDS = [
  'clinicalNotes',
  'clinicalFindings',
  'diagnosisDetails',
  'prescriptionDetails',
  'internalScreeningNotes',
] as const;

export interface HealthcareProviderScope {
  viewReferredPatients: boolean;
  viewScreenings: boolean;
  viewPendingProfessionalReviews: boolean;
  viewEnrollments: boolean;
  viewAppointments: boolean;
  communicateWithPatient: boolean;
}

export const DEFAULT_PROVIDER_SCOPE: HealthcareProviderScope = {
  viewReferredPatients: false,
  viewScreenings: false,
  viewPendingProfessionalReviews: false,
  viewEnrollments: false,
  viewAppointments: false,
  communicateWithPatient: false,
};
