export const DECISION_NUMBER_PREFIX = 'DEC';
export const DECISION_NOTICE_NUMBER_PREFIX = 'DN';

export const PHASE_8C_BOUNDARY_DISCLAIMER =
  'Phase 8C records formal decision findings, reasons, conditions, and notice preparation. It does not deliver notices to applicants or issue instruments.';

export const FORBIDDEN_PHASE_8D_MODELS = [
  'IssuedLicense',
  'IssuedPermit',
  'IssuedCertificate',
  'DecisionNoticeDelivery',
] as const;

export const APPROVED_CONDITION_IMMUTABLE_MESSAGE =
  'Approved decision conditions cannot be silently altered; amendment requires an authorized lifecycle action';

export const AI_DRAFT_REQUIRES_HUMAN_CONFIRMATION_MESSAGE =
  'AI-assisted draft rationale cannot become final institutional reasons without explicit human confirmation';

export const PRECEDENT_BLOCKS_ISSUANCE_MESSAGE =
  'Unsatisfied condition precedent to issuance blocks issuance unless explicit authority permits otherwise';

export const RETURN_FOR_INFO_CANNOT_MASK_REFUSAL_MESSAGE =
  'Return for information cannot be used to secretly encode a final adverse decision';

export const NOTICE_DOES_NOT_ISSUE_INSTRUMENT_MESSAGE =
  'DecisionNotice preparation does not issue an instrument; issuance belongs to a later phase';
