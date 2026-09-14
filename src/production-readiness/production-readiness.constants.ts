export const PHASE_13F_BOUNDARY_DISCLAIMER =
  'Attendance != Competence. Course Completion != Qualification. System Role != Appointment. Technical Permission != Authority. Staff Assigned != Staff Available. Named Owner != Operational Coverage.';

export const OPERATOR_QUALIFICATION_STATUSES = [
  'QUALIFIED',
  'QUALIFIED_WITH_CONDITIONS',
  'NOT_QUALIFIED',
  'SUSPENDED',
  'EXPIRED',
  'WITHDRAWN',
] as const;

export const DEPARTMENT_READINESS_STATUSES = [
  'NOT_READY',
  'PARTIALLY_READY',
  'READY_WITH_CONDITIONS',
  'READY',
  'SUSPENDED',
] as const;

export const QUALIFIED_STATUSES = ['QUALIFIED', 'QUALIFIED_WITH_CONDITIONS'] as const;

export const FORBIDDEN_CLIENT_QUALIFICATION_FIELDS = [
  'status',
  'isAiAssessed',
  'effectiveFrom',
  'effectiveUntil',
  'accessRetained',
] as const;

export const FORBIDDEN_CLIENT_READINESS_FIELDS = [
  'status',
  'isInstitutionalAcceptance',
  'selfActivated',
  'supportCoverageGapDetected',
  'staffingShortageDetected',
] as const;

export const FORBIDDEN_CLIENT_SUPPORT_FIELDS = [
  'isTwentyFourSeven',
  'contactsRestricted',
] as const;

export const AI_ACTOR_ROLE_MARKER = 'AI_ASSISTANCE';
export const AI_ACTOR_IDENTITY_PREFIX = 'ai-assistant:';

export const PRODUCTION_READINESS_REASON_CODES = {
  ATTENDANCE_NOT_COMPETENCE: 'ATTENDANCE_NOT_COMPETENCE',
  COURSE_COMPLETION_NOT_QUALIFICATION: 'COURSE_COMPLETION_NOT_QUALIFICATION',
  SYSTEM_ROLE_NOT_APPOINTMENT: 'SYSTEM_ROLE_NOT_APPOINTMENT',
  TECHNICAL_PERMISSION_NOT_AUTHORITY: 'TECHNICAL_PERMISSION_NOT_AUTHORITY',
  STAFF_ASSIGNED_NOT_AVAILABLE: 'STAFF_ASSIGNED_NOT_AVAILABLE',
  NAMED_OWNER_NOT_COVERAGE: 'NAMED_OWNER_NOT_COVERAGE',
  AI_CANNOT_QUALIFY_OPERATOR: 'AI_CANNOT_QUALIFY_OPERATOR',
  TRAINING_PROVIDER_CANNOT_SELF_ASSIGN_AUTHORITY: 'TRAINING_PROVIDER_CANNOT_SELF_ASSIGN_AUTHORITY',
  QUALIFICATION_EXPIRED: 'QUALIFICATION_EXPIRED',
  QUALIFICATION_SUSPENDED: 'QUALIFICATION_SUSPENDED',
  QUALIFICATION_NOT_QUALIFIED: 'QUALIFICATION_NOT_QUALIFIED',
  QUALIFICATION_SCOPE_MISMATCH: 'QUALIFICATION_SCOPE_MISMATCH',
  APPOINTMENT_REQUIRED: 'APPOINTMENT_REQUIRED',
  DELEGATION_REQUIRED: 'DELEGATION_REQUIRED',
  ALTERNATE_CANNOT_ASSUME_OFFICE: 'ALTERNATE_CANNOT_ASSUME_OFFICE',
  DEPARTMENT_READINESS_NOT_INSTITUTIONAL_ACCEPTANCE: 'DEPARTMENT_READINESS_NOT_INSTITUTIONAL_ACCEPTANCE',
  DEPARTMENT_CANNOT_SELF_ACTIVATE: 'DEPARTMENT_CANNOT_SELF_ACTIVATE',
  SUPPORT_COVERAGE_GAP: 'SUPPORT_COVERAGE_GAP',
  STAFFING_SHORTAGE_BLOCKS_READINESS: 'STAFFING_SHORTAGE_BLOCKS_READINESS',
  HIGH_CONSEQUENCE_ACCESS_DENIED: 'HIGH_CONSEQUENCE_ACCESS_DENIED',
  PROFESSIONAL_QUALIFICATION_EXPIRED: 'PROFESSIONAL_QUALIFICATION_EXPIRED',
  ACCESS_REVIEW_REQUIRED: 'ACCESS_REVIEW_REQUIRED',
} as const;

export const ATTENDANCE_NOT_COMPETENCE_MESSAGE =
  'Attendance at training does not establish operator competence or qualification';

export const COURSE_COMPLETION_NOT_QUALIFICATION_MESSAGE =
  'Course completion alone does not establish governmental qualification';

export const AI_CANNOT_QUALIFY_OPERATOR_MESSAGE =
  'AI assistance cannot qualify an operator for production roles';

export const TRAINING_PROVIDER_SELF_AUTHORITY_MESSAGE =
  'Training providers cannot self-assign governmental assessment authority';

export const ALTERNATE_CANNOT_ASSUME_OFFICE_MESSAGE =
  'An alternate does not gain authority until applicable appointment and delegation conditions are met';

export const DEPARTMENT_READINESS_NOT_ACCEPTANCE_MESSAGE =
  'Department readiness assessment does not equal institutional acceptance';

export const DEPARTMENT_CANNOT_SELF_ACTIVATE_MESSAGE =
  'A ready department cannot activate itself without separate activation authority';

export const PHASE_13F_INVARIANTS = {
  attendanceNotCompetence: true,
  courseCompletionNotQualification: true,
  systemRoleNotAppointment: true,
  technicalPermissionNotAuthority: true,
  staffAssignedNotAvailable: true,
  namedOwnerNotCoverage: true,
  aiCannotQualifyOperator: true,
  trainingProviderCannotSelfAssignAuthority: true,
  alternateCannotAssumeOffice: true,
  departmentReadinessNotInstitutionalAcceptance: true,
  departmentCannotSelfActivate: true,
  qualificationScopeEnforced: true,
  expiredTrainingBlocksHighConsequence: true,
  expiredProfessionalQualificationBlocks: true,
  revokedDelegationTriggersAccessReview: true,
  supportCoverageGapVisible: true,
  staffingShortageBlocksReadiness: true,
} as const;
