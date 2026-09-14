export const PHASE_9D_MODEL_NAMES = [
  'InspectionSession',
  'InspectionObservation',
  'InspectionObservationEvidence',
  'InspectionFinding',
  'FindingRequirementLink',
  'InspectionFindingEvidence',
  'InspectionResponse',
  'InspectionResponseEvidence',
  'InspectionCompletionRecord',
] as const;

export const INSPECTION_FINDING_SEVERITIES = [
  'INFORMATIONAL',
  'MINOR',
  'MODERATE',
  'MAJOR',
  'CRITICAL',
] as const;

export const INSPECTION_FINDING_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'CONFIRMED',
  'DISPUTED',
  'CORRECTIVE_ACTION_REQUIRED',
  'REFERRED',
  'CLOSED',
  'REOPENED',
  'SUPERSEDED',
] as const;

export const INSPECTION_RESPONSE_TYPES = [
  'COMMENT',
  'DISPUTED_FACTS',
  'SUPPORTING_EVIDENCE',
  'CORRECTION',
  'CONTEXT',
] as const;

export const FORBIDDEN_OBSERVATION_LEGAL_CONCLUSION_FIELDS = [
  'violation',
  'nonCompliance',
  'sanction',
  'enforcementDecision',
] as const;
