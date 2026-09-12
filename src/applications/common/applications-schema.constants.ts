export const APPLICATION_MODEL_NAMES = [
  'Application',
  'ApplicationSubmission',
  'ApplicationSubmissionIdempotencyKey',
] as const;

export const APPLICATION_STATUS_VALUES = [
  'DRAFT',
  'READY_FOR_SUBMISSION',
  'SUBMITTED',
  'RECEIVED',
  'CORRECTION_REQUESTED',
  'RESUBMITTED',
  'WITHDRAWN',
  'CANCELLED',
  'TRANSFERRED_TO_CASE',
] as const;

export const FORBIDDEN_APPLICATION_STATUS_VALUES = ['APPROVED', 'REFUSED'] as const;

export const PHASE_6G_BOUNDARY_MODEL_NAMES = [
  'CaseWorkflow',
  'EvidencePacket',
  'GovernmentDecision',
  'IssuedLicense',
  'IssuedPermit',
  'PaymentTransaction',
  'InspectionCase',
] as const;
