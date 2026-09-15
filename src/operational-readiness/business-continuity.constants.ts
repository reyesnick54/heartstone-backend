import {
  BacklogPriorityBasis,
  BackupRecoverabilityStatus,
  ContinuityOperatingMode,
  ContinuityScenarioType,
  RestoreTestResult,
} from '@prisma/client';

export const PRODUCTION_READINESS_BOUNDARY_DISCLAIMER =
  'Production readiness continuity services record backup, recovery, manual operation, and resumption governance. ' +
  'Backup success does not prove recoverability. Technical restoration does not institutionalize resumption.';

export const PHASE_13D_BOUNDARY_DISCLAIMER =
  'Phase 13D governs business continuity, disaster recovery, manual fallback, and institutional resumption. ' +
  'Continuity mode is not normal production mode. Emergency authority is time-bounded and not permanent authority.';

export const CRITICAL_SERVICE_REFERENCE_PREFIX = 'CS';
export const BUSINESS_IMPACT_ASSESSMENT_PREFIX = 'BIA';
export const CONTINUITY_EVENT_PREFIX = 'CE';
export const BACKUP_DEFINITION_PREFIX = 'BK';
export const RESTORE_TEST_PREFIX = 'RT';
export const RECOVERY_EXERCISE_PREFIX = 'RE';
export const MANUAL_OPERATION_AUTH_PREFIX = 'MOA';
export const RESUMPTION_ASSESSMENT_PREFIX = 'RRA';
export const RESUMPTION_AUTH_PREFIX = 'RSA';
export const BACKLOG_PLAN_PREFIX = 'BRP';
export const RECONCILIATION_PREFIX = 'MDR';
export const CORRECTIVE_ACTION_PREFIX = 'CCA';

export const CONTINUITY_SCENARIO_TYPES = [
  ContinuityScenarioType.DATABASE_OUTAGE,
  ContinuityScenarioType.STORAGE_OUTAGE,
  ContinuityScenarioType.HOSTING_OUTAGE,
  ContinuityScenarioType.NETWORK_OUTAGE,
  ContinuityScenarioType.IDENTITY_OUTAGE,
  ContinuityScenarioType.INTEGRATION_OUTAGE,
  ContinuityScenarioType.PAYMENT_OUTAGE,
  ContinuityScenarioType.NOTIFICATION_OUTAGE,
  ContinuityScenarioType.AI_PROVIDER_OUTAGE,
  ContinuityScenarioType.CYBERATTACK,
  ContinuityScenarioType.CREDENTIAL_COMPROMISE,
  ContinuityScenarioType.RECORDS_CORRUPTION,
  ContinuityScenarioType.DATA_LOSS,
  ContinuityScenarioType.WORKFORCE_DISRUPTION,
  ContinuityScenarioType.PARTNER_OUTAGE,
] as const;

export const FORBIDDEN_BACKLOG_PRIORITY_BASES = [
  BacklogPriorityBasis.HIGH_VALUE_INVESTOR,
  BacklogPriorityBasis.POLITICALLY_IMPORTANT_APPLICANT,
  BacklogPriorityBasis.EXECUTIVE_REQUEST,
  BacklogPriorityBasis.LARGEST_FEE,
] as const;

export const RESTORE_TEST_VERIFICATION_FIELDS = [
  'backupAvailabilityVerified',
  'decryptionVerified',
  'integrityVerified',
  'completenessVerified',
  'databaseConsistencyVerified',
  'objectIntegrityVerified',
  'auditHistoryVerified',
  'signatureHashVerified',
  'applicationCompatibilityVerified',
  'rpoAchieved',
  'rtoAchieved',
] as const;

export const RECOVERABLE_BACKUP_STATUSES = [BackupRecoverabilityStatus.VERIFIED] as const;

export const RESTORE_TEST_PASSING_RESULTS = [
  RestoreTestResult.PASSED,
  RestoreTestResult.PASSED_WITH_LIMITATIONS,
] as const;

export const PRODUCTION_READINESS_REASON_CODES = {
  BACKUP_NOT_RECOVERY: 'BACKUP_NOT_RECOVERY',
  RESTORE_NOT_INTEGRITY_VERIFIED: 'RESTORE_NOT_INTEGRITY_VERIFIED',
  TECHNICAL_RESTORATION_NOT_RESUMPTION: 'TECHNICAL_RESTORATION_NOT_RESUMPTION',
  EMERGENCY_AUTHORITY_NOT_PERMANENT: 'EMERGENCY_AUTHORITY_NOT_PERMANENT',
  MANUAL_NOT_AUTHORITY_BYPASS: 'MANUAL_NOT_AUTHORITY_BYPASS',
  DISASTER_NOT_REQUIREMENT_WAIVER: 'DISASTER_NOT_REQUIREMENT_WAIVER',
  CONTINUITY_NOT_NORMAL_PRODUCTION: 'CONTINUITY_NOT_NORMAL_PRODUCTION',
  UNTESTED_BACKUP_NOT_RECOVERABLE: 'UNTESTED_BACKUP_NOT_RECOVERABLE',
  CORRUPT_RESTORE_REJECTED: 'CORRUPT_RESTORE_REJECTED',
  RESTORE_WITHOUT_INTEGRITY_REJECTED: 'RESTORE_WITHOUT_INTEGRITY_REJECTED',
  MANUAL_MODE_AUTHORITY_BYPASS: 'MANUAL_MODE_AUTHORITY_BYPASS',
  MANUAL_MODE_SOD_BYPASS: 'MANUAL_MODE_SOD_BYPASS',
  MANUAL_ORIGINAL_NOT_PRESERVED: 'MANUAL_ORIGINAL_NOT_PRESERVED',
  EMERGENCY_CREDENTIAL_SHARED: 'EMERGENCY_CREDENTIAL_SHARED',
  EMERGENCY_AUTHORITY_EXPIRED: 'EMERGENCY_AUTHORITY_EXPIRED',
  INTEGRATION_OUTAGE_VERIFICATION_WAIVER: 'INTEGRATION_OUTAGE_VERIFICATION_WAIVER',
  AI_CANNOT_SUBSTITUTE_REGULATOR: 'AI_CANNOT_SUBSTITUTE_REGULATOR',
  TECHNICAL_AUTO_RESUMPTION_FORBIDDEN: 'TECHNICAL_AUTO_RESUMPTION_FORBIDDEN',
  INSTITUTIONAL_RESUMPTION_REQUIRED: 'INSTITUTIONAL_RESUMPTION_REQUIRED',
  INSECURE_COMMUNICATION_FALLBACK: 'INSECURE_COMMUNICATION_FALLBACK',
  BACKLOG_ARBITRARY_FAVORITISM: 'BACKLOG_ARBITRARY_FAVORITISM',
  EXERCISE_NOT_GUARANTEE: 'EXERCISE_NOT_GUARANTEE',
  FAILED_RECOVERY_CORRECTIVE_OPEN: 'FAILED_RECOVERY_CORRECTIVE_OPEN',
  SUSPENDED_AI_REAUTHORIZATION_REQUIRED: 'SUSPENDED_AI_REAUTHORIZATION_REQUIRED',
  UNVERIFIED_BACKUP_READINESS: 'UNVERIFIED_BACKUP_READINESS',
  ANONYMOUS_EMERGENCY_DECISION: 'ANONYMOUS_EMERGENCY_DECISION',
  MANUAL_AUTHORIZATION_EXPIRATION_REQUIRED: 'MANUAL_AUTHORIZATION_EXPIRATION_REQUIRED',
} as const;

export const FORBIDDEN_CLIENT_BACKUP_FIELDS = [
  'recoverabilityStatus',
  'lastSuccessfulBackupAt',
  'lastTestedRestoreAt',
  'status',
] as const;

export const FORBIDDEN_CLIENT_RESTORE_TEST_FIELDS = ['result', 'testCompletedAt'] as const;

export const FORBIDDEN_CLIENT_RESUMPTION_FIELDS = [
  'overallStatus',
  'institutionalResumptionAt',
  'operatingMode',
] as const;

export const INSECURE_COMMUNICATION_FALLBACK_PATTERNS = [
  /unencrypted/i,
  /plaintext/i,
  /sms-only/i,
  /personal-email/i,
  /consumer-messaging/i,
] as const;

export const CONTINUITY_OPERATING_MODES = [
  ContinuityOperatingMode.NORMAL,
  ContinuityOperatingMode.CONTINUITY,
  ContinuityOperatingMode.MANUAL,
  ContinuityOperatingMode.SAFE_HALT,
] as const;
