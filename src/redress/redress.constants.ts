export const REVIEW_RECORD_SNAPSHOT_NUMBER_PREFIX = 'RRS';
export const RECONSIDERATION_PROCEEDING_NUMBER_PREFIX = 'RCP';
export const INTERNAL_ADMINISTRATIVE_REVIEW_NUMBER_PREFIX = 'IAR';
export const REVIEW_ASSIGNMENT_NUMBER_PREFIX = 'RAS';
export const REVIEW_SUBMISSION_NUMBER_PREFIX = 'RSB';
export const REVIEW_EVIDENCE_ADMISSION_NUMBER_PREFIX = 'REA';
export const REVIEW_RECOMMENDATION_NUMBER_PREFIX = 'RRC';

export const REDRESS_MATTER_NUMBER_PREFIX = 'RM';
export const REDRESS_DECISION_NUMBER_PREFIX = 'RD';

export const PHASE_10E_BOUNDARY_DISCLAIMER =
  'Phase 10E records reconsideration and internal administrative review proceedings. Opening review does not alter the original government decision. Staff recommendations and AI assistance are non-final. Technical permission never creates review authority.';

export const PHASE_10G_BOUNDARY_DISCLAIMER =
  'Phase 10G records final redress disposition, interim relief, stays, remedy implementation, and notices. Filing an appeal does not create an automatic stay unless route configuration explicitly permits it. A stay is not a reversal.';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const FORBIDDEN_CLIENT_REVIEW_FIELDS = [
  'isFinal',
  'decisionStatus',
  'outcome',
  'adminOverride',
  'independenceOverride',
  'systemAdministratorOverride',
] as const;

export const FORBIDDEN_CLIENT_REDRESS_FIELDS = [
  'outcome',
  'decidedAt',
  'effectiveAt',
  'integrityHash',
  'authorityEvaluationRecordId',
  'implementationStatus',
  'stayStatus',
  'isReversal',
] as const;

export const REDRESS_REASON_CODES = {
  ORIGINAL_DECISION_MAKER_BLOCKED: 'ORIGINAL_DECISION_MAKER_BLOCKED',
  MATERIAL_INVOLVEMENT_BLOCKED: 'MATERIAL_INVOLVEMENT_BLOCKED',
  SYSTEM_ROLE_CANNOT_SATISFY_INDEPENDENCE: 'SYSTEM_ROLE_CANNOT_SATISFY_INDEPENDENCE',
  EXPIRED_APPOINTMENT: 'EXPIRED_APPOINTMENT',
  REVOKED_DELEGATION: 'REVOKED_DELEGATION',
  WRONG_JURISDICTION: 'WRONG_JURISDICTION',
  MISSING_AUTHORITY: 'MISSING_AUTHORITY',
  INSUFFICIENT_REVIEWER_LEVEL: 'INSUFFICIENT_REVIEWER_LEVEL',
  INDEPENDENCE_REQUIRES_RECUSAL: 'INDEPENDENCE_REQUIRES_RECUSAL',
  INDEPENDENCE_UNRESOLVED: 'INDEPENDENCE_UNRESOLVED',
  ADMIN_OVERRIDE_FORBIDDEN: 'ADMIN_OVERRIDE_FORBIDDEN',
  TECHNICAL_PERMISSION_NOT_REVIEW_AUTHORITY: 'TECHNICAL_PERMISSION_NOT_REVIEW_AUTHORITY',
  REVIEW_STANDARD_NOT_CONFIGURED: 'REVIEW_STANDARD_NOT_CONFIGURED',
  SNAPSHOT_IMMUTABLE: 'SNAPSHOT_IMMUTABLE',
  POST_DECISION_EVIDENCE_REQUIRED_LABEL: 'POST_DECISION_EVIDENCE_REQUIRED_LABEL',
  AI_RECOMMENDATION_NON_FINAL: 'AI_RECOMMENDATION_NON_FINAL',
  RECOMMENDATION_CANNOT_BE_FINAL: 'RECOMMENDATION_CANNOT_BE_FINAL',
  OPENING_REVIEW_DOES_NOT_ALTER_DECISION: 'OPENING_REVIEW_DOES_NOT_ALTER_DECISION',
  PROCEEDING_TARGET_REQUIRED: 'PROCEEDING_TARGET_REQUIRED',
  DECISION_NOT_FOUND: 'DECISION_NOT_FOUND',
  ASSIGNMENT_DOES_NOT_CREATE_AUTHORITY: 'ASSIGNMENT_DOES_NOT_CREATE_AUTHORITY',
} as const;

export const AUTHORIZED_RECONSIDERATION_STANDARDS = [
  'ORIGINAL_RECORD_ONLY',
  'ORIGINAL_PLUS_PERMITTED_NEW_EVIDENCE',
  'ERROR_REVIEW',
  'MERITS_RECONSIDERATION',
  'OTHER_AUTHORIZED_STANDARD',
] as const;

export const REVIEWER_INDEPENDENCE_OUTCOMES = [
  'INDEPENDENT',
  'CONFLICT_IDENTIFIED',
  'PRIOR_INVOLVEMENT_IDENTIFIED',
  'REQUIRES_RECUSAL',
  'REQUIRES_AUTHORIZED_EXCEPTION',
  'UNRESOLVED',
] as const;

export const INTERNAL_REVIEW_GROUNDS = [
  'AUTHORITY_ERROR',
  'PROCEDURAL_ERROR',
  'EVIDENCE_OMISSION',
  'INCORRECT_CRITERION',
  'CONFLICT',
  'REASONING_DEFECT',
  'NOTICE_DEFECT',
  'AUTOMATION_DEFECT',
  'OTHER_PERMITTED_GROUND',
] as const;

export const FORBIDDEN_AI_REVIEW_ACTIONS = [
  'determine_reconsideration',
  'affirm',
  'reverse',
  'vary',
  'remand',
  'set_aside',
  'decide_credibility',
  'decide_appeal',
] as const;

export const FORBIDDEN_AI_REDRESS_ACTORS = ['AI_ASSISTANCE', 'SERVICE'] as const;

export const REDRESS_DECISION_OUTCOMES = [
  'AFFIRMED',
  'VARIED',
  'RETURNED_OR_REMANDED',
  'CORRECTED',
  'SET_ASIDE',
  'REVERSED',
  'PARTIALLY_AFFIRMED',
  'PARTIALLY_VARIED',
  'DISMISSED_BY_AUTHORIZED_DETERMINATION',
  'WITHDRAWN',
  'REFERRED',
  'OTHER_AUTHORIZED_OUTCOME',
] as const;

export const REDRESS_REMEDY_TYPES = [
  'CORRECT_RECORD',
  'REISSUE_NOTICE',
  'RECONSIDER',
  'REPROCESS',
  'REOPEN_EVIDENCE_REVIEW',
  'NEW_DECISION_REQUIRED',
  'AMEND_INSTRUMENT',
  'REINSTATE_INSTRUMENT',
  'SUSPEND_EFFECT',
  'REFUND_IF_AUTHORIZED',
  'REFER_EXTERNALLY',
  'OTHER_AUTHORIZED_REMEDY',
] as const;

export const INTERIM_RELIEF_REQUEST_TYPES = [
  'STAY',
  'PARTIAL_STAY',
  'TEMPORARY_REINSTATEMENT',
  'PRESERVATION_ORDER',
  'TEMPORARY_ACCESS',
  'INTERIM_OPERATIONAL_PROTECTION',
  'OTHER_AUTHORIZED_INTERIM_RELIEF',
] as const;

export const REDRESS_IMPLEMENTATION_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'SAFE_HALTED',
  'SUPERSEDED',
] as const;

export const REDRESS_REASON_SECTION_TYPES = [
  'ISSUES',
  'FINDINGS',
  'AUTHORITY',
  'EVIDENCE',
  'STANDARD_OF_REVIEW',
  'DISPUTED_EVIDENCE_TREATMENT',
  'NEW_EVIDENCE',
  'REASONS',
  'LIMITATIONS',
  'REMEDY',
] as const;

export const INSTRUMENT_REMEDY_TYPES = [
  'AMEND_INSTRUMENT',
  'REINSTATE_INSTRUMENT',
  'SUSPEND_EFFECT',
] as const;

export const EXTERNAL_REVIEW_REFERRAL_NUMBER_PREFIX = 'ERR';

export const PHASE_10F_BOUNDARY_DISCLAIMER =
  'Phase 10F coordinates external and retained-authority redress. HeartStone may inform, prepare, transmit, coordinate, track, receive, authenticate, record, and implement an external result only where authorized. It does not adjudicate national statutory appeals, judicial review, professional discipline, or external regulatory determinations unless exact configured authority supports it.';

export const EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE =
  'External review referral does not constitute internal adjudication of the challenged decision';

export const RETAINED_NATIONAL_APPEAL_MESSAGE =
  'Sector-specific appeal retained nationally; ABSEZ adjudication is blocked and external coordination only is supported';

export const JUDICIAL_ROUTE_NOT_COURT_MESSAGE =
  'Judicial review information support does not create an internal court or substitute for a competent forum';

export const SILENCE_NOT_APPEAL_SUCCESS_MESSAGE =
  'Government or regulator silence does not constitute appeal success or approval';

export const PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE =
  'Professional challenge remains with the competent professional authority; technology does not substitute for disciplinary authority';

export const RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE =
  'External recommendation or ombuds finding is not a binding determination unless authenticated as such';

export const UNAUTHENTICATED_DETERMINATION_MESSAGE =
  'Unauthenticated external determination cannot be implemented';

export const EXACT_SOURCE_WORDING_MESSAGE =
  'External outcome and remedy text must preserve exact source wording and references';

export const AI_CANNOT_DETERMINE_EXTERNAL_OUTCOME_MESSAGE =
  'AI assistance cannot determine or fabricate external review outcomes';

export const TECHNICAL_ADMIN_CANNOT_FABRICATE_DETERMINATION_MESSAGE =
  'Technical administrators cannot fabricate authenticated external determinations';

export const FORBIDDEN_INTERNAL_ADJUDICATION_OUTCOMES = [
  'APPROVED',
  'UPHELD',
  'DISMISSED',
  'ALLOWED',
  'GRANTED',
] as const;

export const FORBIDDEN_CLIENT_EXTERNAL_REVIEW_FIELDS = [
  'isAuthenticated',
  'implementationAuthorized',
  'bindingClass',
  'outcomeText',
  'remedyText',
  'status',
  'blocksInternalAdjudication',
  'technologySubstitutesAuthority',
  'inferredApprovalFromSilence',
  'isCourtSystem',
  'outcomeAuthenticated',
] as const;

export const AI_ACTOR_ROLE_MARKER = 'AI_ASSISTANCE';

export const PHASE_10F_INVARIANTS = [
  { id: '10F-1', description: 'External appeal not internally adjudicated' },
  { id: '10F-2', description: 'National appeal authority preserved' },
  { id: '10F-3', description: 'Judicial route does not create internal court' },
  { id: '10F-4', description: 'Government silence not appeal success' },
  { id: '10F-5', description: 'Professional challenge remains professional' },
  { id: '10F-6', description: 'External recommendation distinguished from binding determination' },
  { id: '10F-7', description: 'Unauthenticated external determination not implemented' },
  { id: '10F-8', description: 'External record preserves exact source wording/reference' },
  { id: '10F-9', description: 'Referral package version pinned' },
  { id: '10F-10', description: 'Security classification preserved' },
  { id: '10F-11', description: 'AI cannot determine external outcome' },
  { id: '10F-12', description: 'Technical admin cannot fabricate external determination' },
] as const;
