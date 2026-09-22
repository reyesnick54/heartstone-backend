export const EDUCATION_STUDENT_PROFILE_PREFIX = 'EDU-STU';
export const EDUCATION_INSTITUTION_REGISTRY_PREFIX = 'EDU-INST';
export const EDUCATION_ENROLLMENT_APPLICATION_PREFIX = 'EDU-ENR-APP';
export const SCHOLARSHIP_APPLICATION_PREFIX = 'EDU-SCH-APP';
export const EDUCATION_GRANT_APPLICATION_PREFIX = 'EDU-GRANT-APP';

export const EDUCATION_RULE_ENVIRONMENT = 'NON_PRODUCTION';

export const EDUCATION_BOUNDARY_DISCLAIMER =
  'Education application submission records a request only; it does not grant enrollment, accreditation, licensure, scholarships, or credentials.';

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

export const FORBIDDEN_AI_EDUCATION_ACTIONS = [
  'GRANT_ADMISSION',
  'AWARD_SCHOLARSHIP',
  'GRANT_ACCREDITATION',
  'ISSUE_EDUCATOR_LICENSE',
  'ISSUE_INSTITUTION_LICENSE',
  'FINALIZE_EDUCATION_DECISION',
] as const;

export const GUARDIAN_ALLOWED_SCOPE_KEYS = [
  'viewDependentEnrollments',
  'viewEnrollmentApplications',
  'viewSchoolNotices',
  'viewRequiredActions',
  'viewEducationBenefits',
  'viewAppointments',
] as const;

export type GuardianAuthorizedScope = Partial<
  Record<(typeof GUARDIAN_ALLOWED_SCOPE_KEYS)[number], boolean>
>;

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

export const EDUCATION_INVARIANTS = {
  applicationNotEnrollment: true,
  recommendationNotAward: true,
  institutionCannotSelfAccredit: true,
  correctionHistoryPreserved: true,
  studentRecordsNotPublicVerification: true,
  integrationGatewayNotEmbeddedCredentials: true,
} as const;
