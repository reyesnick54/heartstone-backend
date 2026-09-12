export const PHASE_7G_BOUNDARY_DISCLAIMER =
  'Phase 7G governs records retention, legal hold, archival transfer, and controlled disposition. Software defaults do not define institutional retention law or policy.';

export const AUTOMATED_DISPOSITION_OUTCOMES = ['ELIGIBLE_FOR_REVIEW'] as const;

export const FORBIDDEN_AUTOMATED_DISPOSITION_OUTCOMES = ['DESTROY_NOW'] as const;

export const LEGAL_HOLD_RELEASE_AUTHORITY_PERMISSION = 'records.legal_hold.release';

export const DISPOSITION_APPROVAL_PERMISSION = 'records.disposition.authorize';

export const ORDINARY_RECORDS_ADMIN_ROLE = 'records.administrator';

export const EVIDENCE_RECORDS_MODEL_NAMES = [
  'RecordsClassification',
  'RetentionSchedule',
  'RetentionRule',
  'RecordRetentionAssignment',
  'LegalHold',
  'LegalHoldTarget',
  'LegalHoldReleaseRecord',
  'PreservationCollection',
  'PreservationCollectionItem',
  'ExternalRecordsRepository',
  'ArchivalTransfer',
  'ArchivalTransferItem',
  'RecordDispositionRequest',
  'RecordDispositionRecord',
] as const;

export interface DispositionEligibilityEvaluation {
  eligibilityStatus: 'ELIGIBLE_FOR_REVIEW' | 'NOT_ELIGIBLE' | 'BLOCKED';
  safeHaltReasons: string[];
  notes: string[];
}
