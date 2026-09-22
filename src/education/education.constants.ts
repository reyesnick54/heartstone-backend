export const EDUCATION_RULE_ENVIRONMENT = 'NON_PRODUCTION';

export const EDUCATION_SERVICE_PACK_ID = 'template-education-government';
export const EDUCATION_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-EDUCATION';
export const EDUCATION_INSTITUTION_CODE = 'TEMPLATE-INSTITUTION';
export const EDUCATION_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-EDUCATION';
export const EDUCATION_SERVICE_CODE_PREFIX = 'TEMPLATE-EDU-';

export const EDUCATION_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-EDU-INTAKE',
  enrollmentDecide: 'TEMPLATE-AUTH-EDU-ENROLLMENT-DECIDE',
  institutionRegister: 'TEMPLATE-AUTH-EDU-INSTITUTION-REGISTER',
  institutionLicense: 'TEMPLATE-AUTH-EDU-INSTITUTION-LICENSE',
  accreditationDecide: 'TEMPLATE-AUTH-EDU-ACCREDITATION-DECIDE',
  educatorLicense: 'TEMPLATE-AUTH-EDU-EDUCATOR-LICENSE',
  scholarshipDecide: 'TEMPLATE-AUTH-EDU-SCHOLARSHIP-DECIDE',
  grantDecide: 'TEMPLATE-AUTH-EDU-GRANT-DECIDE',
  recordCorrect: 'TEMPLATE-AUTH-EDU-RECORD-CORRECT',
  inspection: 'TEMPLATE-AUTH-EDU-INSPECTION',
  appealDecide: 'TEMPLATE-AUTH-EDU-APPEAL-DECIDE',
} as const;

export const EDUCATION_INTEGRATION_ROUTE_CODES = {
  school: 'TEMPLATE-EDU-GW-SCHOOL',
  university: 'TEMPLATE-EDU-GW-UNIVERSITY',
  examinationBody: 'TEMPLATE-EDU-GW-EXAM-BODY',
  educationRegistry: 'TEMPLATE-EDU-GW-REGISTRY',
  studentInformationSystem: 'TEMPLATE-EDU-GW-SIS',
} as const;

export const EDUCATION_TEMPLATE_SERVICE_DEFINITIONS = [
  { key: 'STUDENT-REGISTRATION', name: 'Student Registration', serviceType: 'REGISTRATION' },
  {
    key: 'PUBLIC-SCHOOL-ENROLLMENT',
    name: 'Public School Enrollment Application',
    serviceType: 'APPLICATION',
  },
  { key: 'SCHOOL-TRANSFER', name: 'School Transfer Request', serviceType: 'APPLICATION' },
  {
    key: 'INSTITUTION-REGISTRATION',
    name: 'Education Institution Registration',
    serviceType: 'REGISTRATION',
  },
  {
    key: 'INSTITUTION-LICENSE',
    name: 'Education Institution License Application',
    serviceType: 'APPLICATION',
  },
  { key: 'ACCREDITATION', name: 'Accreditation Application', serviceType: 'APPLICATION' },
  { key: 'EDUCATOR-LICENSE', name: 'Educator License Application', serviceType: 'APPLICATION' },
  { key: 'EDUCATOR-LICENSE-RENEWAL', name: 'Educator License Renewal', serviceType: 'RENEWAL' },
  { key: 'SCHOLARSHIP', name: 'Scholarship Application', serviceType: 'APPLICATION' },
  { key: 'EDUCATION-GRANT', name: 'Education Grant Application', serviceType: 'APPLICATION' },
  {
    key: 'STUDENT-SUPPORT-PROGRAM',
    name: 'Student Support Program Application',
    serviceType: 'APPLICATION',
  },
  {
    key: 'TRANSCRIPT-REQUEST',
    name: 'Transcript / Academic Record Request',
    serviceType: 'APPLICATION',
  },
  {
    key: 'CREDENTIAL-VERIFICATION',
    name: 'Credential Verification Request',
    serviceType: 'APPLICATION',
  },
  { key: 'RECORD-CORRECTION', name: 'Education Record Correction', serviceType: 'AMENDMENT' },
  {
    key: 'INSTITUTION-INSPECTION',
    name: 'Education Institution Inspection',
    serviceType: 'INSPECTION',
  },
  { key: 'APPEAL-REDRESS', name: 'Education Appeal / Redress', serviceType: 'REDRESS' },
] as const;

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
  ORGANIZATION_MEMBERSHIP_REQUIRED: 'EDUCATION_ORGANIZATION_MEMBERSHIP_REQUIRED',
  INSTITUTION_PROFILE_REQUIRED: 'EDUCATION_INSTITUTION_PROFILE_REQUIRED',
} as const;
