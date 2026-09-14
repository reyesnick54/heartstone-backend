export const ANALYSIS_REQUEST_NUMBER_PREFIX = 'ARQ';
export const ANALYSIS_RUN_NUMBER_PREFIX = 'ARN';
export const INTELLIGENCE_ALERT_NUMBER_PREFIX = 'IAL';
export const RISK_ASSESSMENT_NUMBER_PREFIX = 'RAS';

export const PHASE_12E_BOUNDARY_DISCLAIMER =
  'Phase 12E provides governed analytical assistance, monitoring signals, and risk prioritization. Analysis output is not legal advice, professional certification, a government determination, or a final decision. Alerts are not violations or emergencies. Risk scores do not create authority and cannot bypass mandatory gates.';

export const ANALYSIS_OUTPUT_DISCLAIMER =
  'This analysis supports institutional review only. It is not legal advice, professional certification, a government determination, or a final decision.';

export const INTELLIGENCE_ALERT_DISCLAIMER =
  'This alert is a monitoring signal for review. A generated alert is not a verified event, violation, emergency, or enforcement action.';

export const RISK_SCORE_DISCLAIMER =
  'Risk scores are prioritization aids with versioned methodology. They do not establish legal authority and cannot bypass mandatory evidence or authority requirements.';

export const AI_ACTOR_ROLE_MARKER = 'AI_ASSISTANCE';
export const AI_ACTOR_IDENTITY_PREFIX = 'ai-assistant:';

export const ANALYSIS_NOT_DECISION_MESSAGE =
  'Analysis output cannot be presented as a government decision or final determination';
export const ALERT_NOT_VIOLATION_MESSAGE =
  'Monitoring alerts cannot be characterized as violations or enforcement actions';
export const ALERT_NOT_EMERGENCY_MESSAGE =
  'Monitoring alerts cannot be characterized as emergencies';
export const ALERT_GENERATED_NOT_VERIFIED_MESSAGE =
  'A generated alert is not a verified event; human verification is required where consequential';
export const AI_CANNOT_SELF_VERIFY_ALERT_MESSAGE =
  'Algorithmic or AI actors cannot verify monitoring alerts';
export const AI_CANNOT_IMPOSE_ENFORCEMENT_MESSAGE =
  'AI assistance cannot impose enforcement or sanctions';
export const RISK_SCORE_NOT_AUTHORITY_MESSAGE =
  'Risk scores do not create legal or institutional authority';
export const RISK_SCORE_CANNOT_BYPASS_GATE_MESSAGE =
  'Risk scores cannot bypass mandatory authority or evidence gates';
export const MODEL_ESTIMATE_LABEL_REQUIRED_MESSAGE =
  'Model estimates must be explicitly labeled as MODEL_ESTIMATE';
export const SOURCE_CONFLICT_PRESERVATION_MESSAGE =
  'Conflicting sources must be preserved with exact values; averaging is not permitted';
export const UNAUTHORIZED_PERSONAL_MONITORING_MESSAGE =
  'Monitoring people, communications, locations, devices, or protected information requires institutional purpose, lawful basis, approved access, and proportionate safeguards';
export const MONITORING_SOURCE_NOT_APPROVED_MESSAGE =
  'Monitoring observations must use an approved source configured on the monitoring rule';
export const STALE_SOURCE_SURFACED_MESSAGE =
  'Stale source status must be surfaced on observations and alerts';

export const FORBIDDEN_MONITORING_SUBJECT_TYPES = [
  'PERSON',
  'COMMUNICATION',
  'LOCATION',
  'DEVICE',
  'PROTECTED_INFORMATION',
] as const;

export const INTELLIGENCE_ALERT_STATUSES = [
  'GENERATED',
  'UNDER_REVIEW',
  'VERIFIED_EVENT',
  'FALSE_POSITIVE',
  'UNRESOLVED',
  'ESCALATED',
  'CLOSED',
  'SUPERSEDED',
] as const;

export const RISK_EVIDENCE_BASIS_VALUES = [
  'OBSERVED_FACT',
  'EXPERT_JUDGMENT',
  'MODEL_ESTIMATE',
  'SCENARIO_ASSUMPTION',
  'HISTORICAL_PATTERN',
] as const;

export const ANALYSIS_FUNCTION_TYPES = [
  'REQUIREMENT_COMPARISON',
  'SOURCE_TO_CLAIM_ANALYSIS',
  'EVIDENCE_GAP_IDENTIFICATION',
  'CONFLICTING_SOURCE_DETECTION',
  'OPTION_DEVELOPMENT',
  'RISK_CONSEQUENCE_ANALYSIS',
  'QUESTION_PREPARATION',
  'DECISION_SUPPORT_SUMMARY',
  'PROFESSIONAL_REVIEW_IDENTIFICATION',
] as const;

export const PHASE_12E_INVARIANTS = {
  analysisNotDecision: true,
  alertNotViolation: true,
  alertNotEmergency: true,
  riskScoreNotAuthority: true,
  riskScoreCannotBypassGate: true,
  modelEstimateLabeled: true,
  sourceConflictPreserved: true,
  falsePositivePreserved: true,
  aiCannotSelfVerifyAlert: true,
  aiCannotImposeEnforcement: true,
  monitoringSourceApproved: true,
  unauthorizedPersonalMonitoringBlocked: true,
  staleSourceSurfaced: true,
  uncertaintyPreserved: true,
  humanReviewAttributable: true,
  analysisOutputReplayable: true,
} as const;
