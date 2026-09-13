export const PHASE_8C_MODEL_NAMES = [
  'GovernmentServiceDecisionTypeDefinition',
  'GovernmentDecision',
  'DecisionFinding',
  'DecisionReason',
  'DecisionAssistanceRecord',
  'DecisionCondition',
  'DecisionNotice',
  'DecisionNoticeRight',
] as const;

export const PHASE_8C_ENUM_NAMES = [
  'GovernmentDecisionStatus',
  'GovernmentDecisionOutcome',
  'DecisionFindingStatus',
  'DecisionAssistanceStatus',
  'DecisionConditionType',
  'DecisionConditionStatus',
  'DecisionNoticeStatus',
  'DecisionNoticeRightType',
  'DecisionNoticeEffectTiming',
] as const;

export const DECISION_CONDITION_TYPES = [
  'PRECEDENT_TO_ISSUANCE',
  'PRECEDENT_TO_ACTIVITY',
  'CONTINUING',
  'REPORTING',
  'CORRECTIVE',
  'EXPIRATION',
  'GOVERNMENT_CONFIRMATION',
  'PROFESSIONAL_CONFIRMATION',
  'OTHER_AUTHORIZED_CONDITION',
] as const;

export const DECISION_CONDITION_STATUSES = [
  'NOT_YET_EFFECTIVE',
  'PENDING',
  'SATISFIED',
  'PARTIALLY_SATISFIED',
  'DISPUTED',
  'OVERDUE',
  'FAILED',
  'WAIVED_BY_AUTHORIZED_DECISION',
  'SUPERSEDED',
  'CLOSED',
] as const;

export const DECISION_NOTICE_RIGHT_TYPES = [
  'ADMINISTRATIVE_CORRECTION',
  'CLARIFICATION',
  'COMPLAINT',
  'RECONSIDERATION',
  'INTERNAL_REVIEW',
  'STATUTORY_APPEAL',
  'PROFESSIONAL_CHALLENGE',
  'REGULATORY_REVIEW',
  'OMBUDSMAN_OR_OVERSIGHT',
  'JUDICIAL_REVIEW_INFORMATION',
  'OTHER_AUTHORIZED_ROUTE',
] as const;
