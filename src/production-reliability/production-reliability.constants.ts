export const PHASE_13C_BOUNDARY_DISCLAIMER =
  'Phase 13C provides technical reliability, observability, and operational health signals. Application running does not equal service healthy. HTTP 200 does not equal correct government outcome. Infrastructure availability does not equal institutional availability. SLA targets are configured service objectives, not guaranteed availability. Alerts are not incidents. Technical outages do not grant authority to bypass controls.';

export const TECHNICAL_HEALTH_DISCLAIMER =
  'Technical health states (LIVE, READY, DEGRADED, NOT_READY) describe platform operability only. They do not establish institutional service acceptance, legal authority, or government outcome validity.';

export const SLO_DISCLAIMER =
  'Service level objectives use approved configured target values only. They are not contractual SLAs and do not waive mandatory process requirements when violated.';

export const ALERT_DISCLAIMER =
  'Operational alerts are technical monitoring signals for review. An alert is not an incident, institutional decision, approval, or refusal.';

export const LOAD_TEST_SAFETY_DISCLAIMER =
  'Load and stress tests must target controlled environments unless explicit production testing authorization exists. Production personal data must not be used without specific approval.';

export const PRODUCTION_RELIABILITY_REASON_CODES = {
  INVENTED_SLA_FORBIDDEN: 'INVENTED_SLA_FORBIDDEN',
  HTTP_200_NOT_OUTCOME: 'HTTP_200_DOES_NOT_EQUAL_CORRECT_GOVERNMENT_OUTCOME',
  TECHNICAL_HEALTH_NOT_INSTITUTIONAL: 'TECHNICAL_HEALTH_NOT_INSTITUTIONAL_STATUS',
  ALERT_NOT_INCIDENT: 'ALERT_IS_NOT_INCIDENT',
  ALERT_NOT_DECISION: 'ALERT_CANNOT_BECOME_INSTITUTIONAL_DECISION',
  OUTAGE_NOT_BYPASS: 'TECHNICAL_OUTAGE_DOES_NOT_GRANT_BYPASS_AUTHORITY',
  SLO_VIOLATION_NOT_WAIVER: 'SLO_VIOLATION_CANNOT_SILENTLY_WAIVE_REQUIREMENTS',
  PRODUCTION_LOAD_UNAUTHORIZED: 'PRODUCTION_LOAD_TEST_REQUIRES_AUTHORIZATION',
  PRODUCTION_DATA_UNAPPROVED: 'PRODUCTION_DATA_REQUIRES_EXPLICIT_APPROVAL',
  DEPENDENCY_OUTAGE_ISOLATED: 'DEPENDENCY_OUTAGE_MUST_NOT_MARK_UNRELATED_CAPABILITIES_UNUSABLE',
  STALE_INTEGRATION_VISIBLE: 'STALE_INTEGRATION_STATE_MUST_BE_VISIBLE',
  OBSERVABILITY_CASE_ISOLATION: 'OBSERVABILITY_CANNOT_EXPOSE_ANOTHER_CASE',
  RATE_LIMIT_MANDATORY_FALLBACK: 'MANDATORY_PROCESS_RATE_LIMIT_REQUIRES_FALLBACK',
  PERFORMANCE_NOT_APPROVAL: 'PERFORMANCE_DEGRADATION_DOES_NOT_PRODUCE_APPROVAL_OR_REFUSAL',
  CAPACITY_SAFE_FAIL: 'CAPACITY_EXHAUSTION_MUST_SAFE_FAIL',
  TRACE_CLASSIFICATION_REQUIRED: 'TRACE_MUST_RESPECT_DATA_CLASSIFICATION',
  LOG_SECRET_REDACTION: 'LOGS_MUST_REDACT_SECRETS',
} as const;

export const DEFAULT_RATE_LIMITS: Record<
  string,
  { maxRequests: number; windowSeconds: number; mandatoryFallback?: string }
> = {
  AUTHENTICATION: { maxRequests: 20, windowSeconds: 60 },
  PUBLIC_VERIFICATION: { maxRequests: 30, windowSeconds: 60 },
  SEARCH: { maxRequests: 60, windowSeconds: 60 },
  UPLOAD: { maxRequests: 10, windowSeconds: 60, mandatoryFallback: 'manual_submission_channel' },
  WEBHOOK: { maxRequests: 120, windowSeconds: 60 },
  ANALYTICS_AI: { maxRequests: 15, windowSeconds: 60, mandatoryFallback: 'human_review_queue' },
};

export const FORBIDDEN_TRACE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'privateKey',
  'paymentCardNumber',
  'cvv',
  'sessionCredential',
  'aiSecret',
  'restrictedRecordContent',
] as const;

export const FORBIDDEN_OBSERVABILITY_CASE_FIELDS = [
  'caseId',
  'caseNumber',
  'applicantPii',
] as const;

export const RELIABILITY_NUMBER_PREFIXES = {
  HEALTH_EVENT: 'OHE',
  ALERT: 'OAL',
  CAPACITY_ASSESSMENT: 'CAS',
  PERFORMANCE_RUN: 'PTR',
  LOAD_RUN: 'LTR',
  STRESS_RUN: 'STR',
} as const;

export const PHASE_13C_INVARIANTS = {
  applicationRunningNotHealthy: true,
  http200NotOutcome: true,
  infrastructureNotInstitutional: true,
  slaTargetNotGuaranteed: true,
  alertNotIncident: true,
  outageNotBypass: true,
  sloViolationNotWaiver: true,
  productionLoadRequiresAuth: true,
  dependencyOutageIsolated: true,
  staleIntegrationVisible: true,
  logsRedactSecrets: true,
  tracesRespectClassification: true,
  rateLimitObservable: true,
  loadPreservesAuthority: true,
  idempotencyPreserved: true,
  performanceNotApproval: true,
  queueRetryNoDuplicate: true,
  capacitySafeFail: true,
  observabilityCaseIsolation: true,
} as const;
