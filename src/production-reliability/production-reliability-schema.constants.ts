export const PHASE_13C_MODEL_NAMES = [
  'ServiceReliabilityDefinition',
  'ServiceLevelObjective',
  'ServiceLevelIndicator',
  'AvailabilityMeasurement',
  'LatencyMeasurement',
  'CapacityProfile',
  'CapacityAssessment',
  'PerformanceTestRun',
  'LoadTestRun',
  'StressTestRun',
  'ResourceSaturationRecord',
  'OperationalHealthEvent',
  'ObservabilitySignalDefinition',
  'OperationalAlertRule',
  'OperationalAlertEvent',
  'OperationalRunbook',
  'SupportEscalationRule',
] as const;

export const PHASE_13C_ENUM_NAMES = [
  'ServiceReliabilityDefinitionStatus',
  'ServiceLevelObjectiveStatus',
  'ServiceLevelIndicatorType',
  'SliMeasurementStatus',
  'TechnicalHealthState',
  'DependencyType',
  'DependencyHealthState',
  'CapacityProfileStatus',
  'CapacityAssessmentStatus',
  'PerformanceTestScenarioType',
  'PerformanceTestRunStatus',
  'LoadTestRunStatus',
  'StressTestRunStatus',
  'ResourceSaturationLevel',
  'OperationalHealthEventType',
  'ObservabilitySignalType',
  'LogClassification',
  'OperationalAlertRuleStatus',
  'OperationalAlertSeverity',
  'OperationalAlertEventStatus',
  'OperationalRunbookStatus',
  'SupportEscalationRuleStatus',
  'RateLimitScope',
] as const;

export const SLI_INDICATOR_TYPES = [
  'AVAILABILITY',
  'LATENCY',
  'ERROR_RATE',
  'QUEUE_DEPTH',
  'WORKFLOW_THROUGHPUT',
  'DATABASE_PERFORMANCE',
  'INTEGRATION_AVAILABILITY',
  'NOTIFICATION_DELIVERY',
  'PAYMENT_PROCESSING',
  'EVIDENCE_STORAGE',
  'AI_SERVICE_AVAILABILITY',
  'BACKGROUND_JOBS',
] as const;

export const TECHNICAL_HEALTH_STATES = ['LIVE', 'READY', 'DEGRADED', 'NOT_READY'] as const;

export const DEPENDENCY_TYPES = [
  'DATABASE',
  'CACHE',
  'STORAGE',
  'EXTERNAL_INTEGRATION',
  'PAYMENT_PROVIDER',
  'NOTIFICATION_PROVIDER',
  'AI_PROVIDER',
  'IDENTITY_PROVIDER',
] as const;

export const PERFORMANCE_TEST_SCENARIOS = [
  'NORMAL',
  'PEAK',
  'BURST',
  'DEGRADED',
  'LARGE_DOCUMENT',
  'HIGH_CONCURRENCY',
  'QUEUE_BACKLOG',
  'SLOW_EXTERNAL_DEPENDENCY',
] as const;

export const RUNBOOK_SCENARIOS = [
  'API_DEGRADATION',
  'DATABASE_DEGRADATION',
  'QUEUE_BACKLOG',
  'INTEGRATION_OUTAGE',
  'NOTIFICATION_OUTAGE',
  'PAYMENT_OUTAGE',
  'STORAGE_EXHAUSTION',
  'AI_PROVIDER_OUTAGE',
  'CREDENTIAL_FAILURE',
  'CERTIFICATE_EXPIRY',
  'HIGH_ERROR_RATE',
] as const;

export const RATE_LIMIT_SCOPES = [
  'AUTHENTICATION',
  'PUBLIC_VERIFICATION',
  'SEARCH',
  'UPLOAD',
  'WEBHOOK',
  'ANALYTICS_AI',
] as const;

export const LOG_CLASSIFICATIONS = [
  'PUBLIC',
  'OPERATIONAL',
  'SECURITY_SENSITIVE',
  'RESTRICTED',
  'PII_RESTRICTED',
] as const;
