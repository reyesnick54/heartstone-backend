export const EDUCATION_INSTITUTION_REFERENCE_PREFIX = 'EDIN';
export const STUDENT_EDUCATION_PROFILE_PREFIX = 'STED';
export const ENROLLMENT_REFERENCE_PREFIX = 'ENRL';
export const ADMISSION_APPLICATION_PROFILE_PREFIX = 'EDAP';
export const SCHOLARSHIP_APPLICATION_PROFILE_PREFIX = 'SCAP';
export const ACADEMIC_RECORD_REFERENCE_PREFIX = 'ACRC';
export const TRANSCRIPT_REFERENCE_PREFIX = 'TRSC';
export const ACADEMIC_CREDENTIAL_REFERENCE_PREFIX = 'ACCR';

export const EDUCATION_BOUNDARY_DISCLAIMER =
  'School registration and admission applications record submitted information only; they do not confer government accreditation, official enrollment, or issued academic credentials.';

export const EDUCATION_PAYMENT_BOUNDARY_DISCLAIMER =
  'Payment receipt does not create admission, enrollment, or scholarship awards.';

export const EDUCATION_AI_BOUNDARY_DISCLAIMER =
  'AI assistance may recommend or summarize education records but cannot approve admission, scholarships, or issue government academic credentials.';

export const FORBIDDEN_AI_EDUCATION_ACTIONS = [
  'APPROVE_ADMISSION',
  'APPROVE_SCHOLARSHIP',
  'ISSUE_ACADEMIC_CREDENTIAL',
  'GRANT_ACCREDITATION',
  'RECORD_OFFICIAL_ENROLLMENT',
  'FINALIZE_EDUCATION_DECISION',
] as const;

export const FORBIDDEN_INSTITUTION_SELF_ACCREDITATION_ACTIONS = [
  'SELF_MARK_ACCREDITED',
  'SELF_ISSUE_LICENSE',
  'SELF_DECLARE_ACCREDITATION',
] as const;

export const EDUCATION_GUARDIAN_SCOPE_KEYS = [
  'viewEnrollmentSummary',
  'viewTranscriptSummary',
  'viewAttendanceSummary',
  'viewSupportPrograms',
] as const;

export type EducationGuardianAccessScope = Partial<
  Record<(typeof EDUCATION_GUARDIAN_SCOPE_KEYS)[number], boolean>
>;

export const EDUCATION_INVARIANTS = {
  studentAccountNotEnrollment: true,
  applicationNotEnrollment: true,
  admissionNotEnrollment: true,
  enrollmentNotGraduation: true,
  academicRecordNotGovernmentCredential: true,
  schoolResultNotGovernmentVerification: true,
  scholarshipApplicationNotAward: true,
  paymentNotAdmission: true,
  registrationNotAccreditation: true,
  institutionCannotSelfAccredit: true,
  aiRecommendationNotDecision: true,
  transcriptHistoryPreserved: true,
  publicVerificationMinimal: true,
} as const;

export const EDUCATION_REASON_CODES = {
  CROSS_STUDENT_ACCESS_DENIED: 'EDUCATION_CROSS_STUDENT_ACCESS_DENIED',
  GUARDIAN_RELATIONSHIP_REQUIRED: 'EDUCATION_GUARDIAN_RELATIONSHIP_REQUIRED',
  GUARDIAN_ACCESS_REVOKED: 'EDUCATION_GUARDIAN_ACCESS_REVOKED',
  GUARDIAN_SCOPE_DENIED: 'EDUCATION_GUARDIAN_SCOPE_DENIED',
} as const;
