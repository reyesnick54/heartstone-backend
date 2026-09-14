export const PHASE_12F_BOUNDARY_DISCLAIMER =
  'Digital Twin != Real Object. Simulation != Live Operation. Modeled Condition != Observed Condition. Scenario != Prediction. Twin Output != Decision. APPROVED_LIVE_REFERENCE is not operational control authority.';

export const DIGITAL_TWIN_TYPES = [
  'INSTITUTION',
  'DEPARTMENT',
  'SERVICE',
  'APPLICATION',
  'CASE',
  'PROJECT',
  'INFRASTRUCTURE',
  'DEPENDENCY',
  'AUTHORITY',
  'WORKFLOW',
  'OTHER_APPROVED',
] as const;

export const DIGITAL_TWIN_MODES = [
  'DESIGN',
  'TRAINING',
  'SIMULATION',
  'TEST',
  'SHADOW',
  'ADVISORY',
  'CONTROLLED_PILOT',
  'APPROVED_LIVE_REFERENCE',
] as const;

export const DIGITAL_TWIN_SOURCE_STATUSES = [
  'AUTHORITATIVE',
  'SUPPORTING',
  'MODELED',
  'UNVERIFIED',
] as const;

export const CONSEQUENTIAL_USE_IMPACT_AREAS = [
  'PERSON',
  'PROJECT',
  'INSTITUTION',
  'PUBLIC_SERVICE',
  'FINANCIAL_INTEREST',
  'INFRASTRUCTURE',
  'LEGAL_POSITION',
  'GOVERNMENT_DECISION',
] as const;

export const FORBIDDEN_SIMULATION_LIVE_MUTATIONS = [
  'GovernmentDecision',
  'Case',
  'OfficialInstrument',
  'CaseEvent',
  'CaseCommunication',
  'ContinuingObligation',
  'ComplianceMatter',
  'RedressDecision',
  'RedressNotice',
] as const;

export const FORBIDDEN_SIMULATION_LIVE_ACTIONS = [
  'ISSUE_LICENSE',
  'CHANGE_PROJECT_STAGE',
  'SEND_PUBLIC_EVENT_NOTICE',
  'MUTATE_CASE_STATUS',
  'FINALIZE_GOVERNMENT_DECISION',
  'ISSUE_OFFICIAL_INSTRUMENT',
  'CREATE_REAL_WORLD_OBLIGATION',
  'CONTROL_LIVE_INFRASTRUCTURE',
] as const;

export const FORBIDDEN_AI_TWIN_FINAL_ACTIONS = [
  'FINAL_DECIDE',
  'APPROVE_CONSEQUENTIAL_USE',
  'AUTHORIZE_LIVE_TRANSITION',
  'DECLARE_AUTHORITATIVE',
] as const;

export const FORBIDDEN_CLIENT_TWIN_FIELDS = [
  'isAuthoritativeRecord',
  'isStale',
  'isIncomplete',
  'isInconsistent',
  'isCompromised',
  'outsideApprovedUse',
  'liveActivationAuthorized',
  'isOperationalControl',
  'presentedAsPrediction',
  'isPrediction',
] as const;

export const AI_ACTOR_ROLE_MARKER = 'AI_ASSISTANCE';

export const INTELLIGENCE_REASON_CODES = {
  TWIN_NOT_AUTHORITATIVE: 'TWIN_NOT_AUTHORITATIVE_RECORD',
  SIMULATION_CANNOT_MUTATE_LIVE: 'SIMULATION_CANNOT_MUTATE_LIVE_RECORD',
  SCENARIO_NOT_PREDICTION: 'SCENARIO_CANNOT_BE_PRESENTED_AS_PREDICTION',
  MODELED_NOT_OBSERVED: 'MODELED_DEPENDENCY_IS_NOT_OBSERVED_FACT',
  STALE_TWIN_BLOCKS_USE: 'STALE_TWIN_BLOCKS_CONSEQUENTIAL_USE',
  INCOMPLETE_TWIN_BLOCKS_USE: 'INCOMPLETE_TWIN_BLOCKS_CONSEQUENTIAL_USE',
  MISSING_SOURCE_UNDISCLOSED: 'MISSING_SOURCE_MUST_BE_DISCLOSED',
  AI_CANNOT_FINAL_DECIDE: 'AI_CANNOT_FINAL_DECIDE_CONSEQUENTIAL_USE',
  LIVE_TRANSITION_REQUIRES_ACCEPTANCE: 'LIVE_TRANSITION_REQUIRES_SEPARATE_ACCEPTANCE',
  TWIN_CANNOT_OWN_ITSELF: 'TWIN_OWNER_CANNOT_BE_TWIN_ITSELF',
  CASE_TWIN_PROFILE_EXPANSION: 'CASE_TWIN_CANNOT_BECOME_UNCONTROLLED_PERSONAL_PROFILE',
  SNAPSHOT_IMMUTABLE: 'SNAPSHOT_IS_IMMUTABLE',
  ROLLBACK_REQUIRED: 'ROLLBACK_PATH_REQUIRED_FOR_LIVE_TRANSITION',
  OPERATIONAL_CONTROL_FORBIDDEN: 'PHASE_12_DOES_NOT_DIRECTLY_CONTROL_INFRASTRUCTURE',
  CONSEQUENTIAL_REVIEW_REQUIRED: 'CONSEQUENTIAL_USE_REVIEW_REQUIRED',
  TECHNICAL_SUCCESS_NOT_ACTIVATION: 'TECHNICAL_SUCCESS_DOES_NOT_EQUAL_LIVE_ACTIVATION',
} as const;
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
export const PROJECT_PROJECTION_DISCLAIMER =
  'This project status is a derived operational projection. It is not an approval decision, operational certification, or independent verification of sponsor assertions.';

export const SECTOR_OBSERVATION_DISCLAIMER =
  'Sector observations do not establish national economic causation attributable to platform deployment.';

export const STRATEGIC_PROJECT_RISK_SCORE_DISCLAIMER =
  'Risk scores are prioritization aids only. They do not affect project approval status.';

export const INTELLIGENCE_BOUNDARY_DISCLAIMER =
  'Dashboard numbers are not evidence. Metric results are not institutional claims. Correlation is not causation.';

export const FORBIDDEN_AI_PERFORMANCE_ACTIONS = [
  'approveOfficialPerformanceClaim',
  'verifyPerformanceClaim',
  'publishPerformanceClaim',
  'setAttributionCausal',
] as const;

export const FORBIDDEN_METRIC_PUBLISH_FIELDS = [
  'published',
  'approvedForPublication',
  'dashboardVisible',
] as const;

export const CONFLATION_PAIRS = [
  { source: 'APPLICATION_COMPLETE', notEqual: 'APPROVED' },
  { source: 'FORECAST_EMPLOYMENT', notEqual: 'JOBS_CREATED' },
  { source: 'PROPOSED_INVESTMENT', notEqual: 'COMMITTED_INVESTMENT' },
  { source: 'COMMITTED_INVESTMENT', notEqual: 'DEPLOYED_CAPITAL' },
  { source: 'PROJECT_ANNOUNCEMENT', notEqual: 'OPERATIONAL_PROJECT' },
  { source: 'SYSTEM_UPTIME', notEqual: 'INSTITUTIONAL_SERVICE_INTEGRITY' },
  { source: 'CORRELATION', notEqual: 'CAUSATION' },
] as const;

export const DEFAULT_ATTRIBUTION = 'NOT_ESTABLISHED' as const;

export const BASELINE_UNAVAILABLE_VALUE = 'BASELINE_UNAVAILABLE' as const;

export const FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS = [
  'PROMOTE_PROJECT_STAGE',
  'SET_MILESTONE_COMPLETED',
  'ESCALATE_CAPITAL_CLASSIFICATION',
  'COUNT_FORECAST_AS_EMPLOYMENT',
  'VERIFY_INFRASTRUCTURE_FROM_DASHBOARD',
  'PUBLISH_ECONOMIC_CLAIM_WITHOUT_REVIEW',
  'CLEAR_ADVERSE_STATUS',
] as const;

export const FORBIDDEN_CLIENT_PROJECT_STATUS_FIELDS = [
  'currentStage',
  'derivedStage',
  'projectionVersion',
  'lastDerivedAt',
  'adverseStatusPreserved',
] as const;

export const FORBIDDEN_CLIENT_MILESTONE_FIELDS = ['status'] as const;

export const FORBIDDEN_CLIENT_CAPITAL_FIELDS = ['classification'] as const;

export const CAPITAL_CLASSIFICATION_ORDER = [
  'PROPOSED',
  'INDICATED',
  'COMMITTED',
  'CONTRACTED',
  'FUNDED',
  'AVAILABLE',
  'DEPLOYED',
  'VERIFIED_DEPLOYED',
] as const;

export const EMPLOYMENT_VERIFIED_CLASSIFICATIONS = ['ACTIVE_VERIFIED'] as const;

export const EMPLOYMENT_FORECAST_CLASSIFICATIONS = ['FORECAST'] as const;

export const MILESTONE_COMPLETED_STATUSES = ['COMPLETED', 'ACCEPTED'] as const;

export const MILESTONE_VERIFIED_STATUSES = [
  'VERIFIED',
  'ACCEPTED',
  'COMPLETED',
  'REVALIDATED',
] as const;

export const STAGE_APPROVAL_STAGES = [
  'APPROVED',
  'PRE_IMPLEMENTATION',
  'IMPLEMENTATION',
  'PARTIALLY_OPERATIONAL',
  'OPERATIONAL',
] as const;

export const PUBLIC_ECONOMIC_CLAIM_REVIEW_STATUSES = ['VERIFIED', 'PUBLIC'] as const;

export const PHASE_12A_MODEL_NAMES = ['PerformanceClaim'] as const;

export const PHASE_12A_ENUM_NAMES = [
  'PerformanceClaimCategory',
  'PerformanceClaimReviewStatus',
] as const;

export const PHASE_12C_MODEL_NAMES = [
  'StrategicProjectProfile',
  'StrategicProjectStage',
  'StrategicProjectMilestone',
  'StrategicProjectDependency',
  'StrategicProjectRisk',
  'StrategicProjectEconomicClaim',
  'CapitalEvidenceRecord',
  'EmploymentEvidenceRecord',
  'InfrastructureDeliveryRecord',
  'SectorDevelopmentObservation',
  'ProjectStatusProjection',
] as const;

export const PHASE_12C_ENUM_NAMES = [
  'StrategicProjectLifecycleStage',
  'StrategicProjectMilestoneStatus',
  'CapitalEvidenceClassification',
  'EmploymentEvidenceClassification',
  'InfrastructureDeliveryStage',
  'StrategicProjectDependencyType',
  'StrategicProjectDependencyOwnerType',
  'StrategicProjectRiskLevel',
  'ProjectStatusProjectionAudience',
] as const;

export const PHASE_12C_INVARIANTS = [
  'inquiry is not qualified application',
  'project announcement is not operational',
  'planned milestone is not completed',
  'reported milestone is not verified',
  'proposed capital is not committed',
  'committed capital is not deployed',
  'employment forecast is not verified employment',
  'dashboard status is not proof of infrastructure completion',
  'applicant assertion is not independent verification',
  'government dependency owner is preserved',
  'risk score cannot change project approval',
  'AI cannot promote project stage autonomously',
  'adverse project status is preserved',
  'public economic claim requires claim review',
] as const;

export const STRATEGIC_PROJECT_LIFECYCLE_STAGES = [
  'INQUIRY',
  'QUALIFICATION',
  'APPLICATION',
  'UNDER_REVIEW',
  'CONDITIONALLY_ADVANCING',
  'APPROVED',
  'PRE_IMPLEMENTATION',
  'IMPLEMENTATION',
  'PARTIALLY_OPERATIONAL',
  'OPERATIONAL',
  'SUSPENDED',
  'CLOSED',
] as const;

export const STRATEGIC_PROJECT_DEPENDENCY_TYPES = [
  'GOVERNMENT',
  'PROFESSIONAL',
  'UTILITY',
  'FINANCE',
  'LAND',
  'PLANNING',
  'ENVIRONMENTAL',
  'CUSTOMS',
  'IMMIGRATION',
  'LABOUR',
  'SECURITY',
  'TECHNOLOGY',
  'SUPPLIER',
  'INFRASTRUCTURE',
] as const;

export const DASHBOARD_PROJECTION_DISCLAIMER =
  'Dashboard indicators are derived operational projections. Visibility does not create permission or institutional authority to act.';

export const DASHBOARD_STATUS_DISCLAIMER =
  'Displayed status labels and color semantics are presentation aids only. They do not establish legal compliance, violation findings, or enforcement decisions.';

export const DASHBOARD_STALE_DATA_DISCLAIMER =
  'Stale or cached indicator values remain visible with explicit staleness markers. Cached values are never presented as live data.';

export const FORBIDDEN_CLIENT_DASHBOARD_FIELDS = [
  'status',
  'countValue',
  'scoreValue',
  'currentStaleness',
  'dataQuality',
  'projectionVersion',
  'calculatedAt',
  'lastDerivedAt',
  'createsAuthority',
  'impliesApproval',
  'impliesIssuance',
] as const;

export const FORBIDDEN_STATUS_COLLAPSE_GROUPS = [
  ['RECOMMENDED', 'APPROVED', 'ISSUED'],
  ['REPORTED', 'VERIFIED', 'ACHIEVED'],
] as const;

export const FORBIDDEN_COLOR_LEGAL_MAPPINGS = [
  'GREEN = legally compliant',
  'RED = violation',
  'AMBER = Government concern',
] as const;

export const PHASE_12B_INVARIANTS = [
  'Dashboard visibility does not create authority to act',
  'Green indicator without evidence is blocked',
  'Technical admin is not automatically a substantive user',
  'Stale status remains visible',
  'Estimated, disputed, modeled, and external-reported data remain distinguishable',
  'Every material indicator drills to authoritative records',
  'Snapshots are immutable once captured',
  'Widgets cannot invent unsupported status dictionary entries',
  'Dashboard cannot collapse recommended/approved/issued',
  'Dashboard cannot collapse reported/verified/achieved',
] as const;
