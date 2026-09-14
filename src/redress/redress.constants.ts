export const ADMINISTRATIVE_CORRECTION_MATTER_NUMBER_PREFIX = 'ADM-CORR';
export const CLARIFICATION_REQUEST_NUMBER_PREFIX = 'CLAR';
export const AUTOMATION_CHALLENGE_NUMBER_PREFIX = 'AUTO-CHAL';

export const ADMINISTRATIVE_CORRECTION_CATEGORIES = [
  'TYPOGRAPHICAL_ERROR',
  'CONTACT_INFORMATION',
  'CLERICAL_MISSTATEMENT',
  'DUPLICATE_RECORD',
  'DOCUMENT_ASSOCIATION',
  'CALCULATION_ERROR',
  'STATUS_DISPLAY_ERROR',
  'DELIVERY_ERROR',
  'OTHER_AUTHORIZED_NONSUBSTANTIVE_ERROR',
] as const;

export const PROTECTED_SUBSTANTIVE_ATTRIBUTES = [
  'finalOutcome',
  'outcome',
  'materialReason',
  'reasons',
  'scope',
  'legalRight',
  'legalObligation',
  'materialCondition',
  'conditions',
  'decisionMaker',
  'authorityBasis',
  'substantiveEvidenceAssessment',
  'evidenceAssessment',
  'instrumentHolder',
  'holder',
  'instrumentDuration',
  'duration',
  'regulatedStatus',
  'status',
] as const;

export const SUBSTANTIVE_ATTRIBUTE_ALIASES: Record<string, string> = {
  outcome: 'finalOutcome',
  reasons: 'materialReason',
  conditions: 'materialCondition',
  evidenceAssessment: 'substantiveEvidenceAssessment',
  holder: 'instrumentHolder',
  duration: 'instrumentDuration',
  status: 'regulatedStatus',
};

export const AUTOMATION_CHALLENGE_GROUNDS = [
  'INCORRECT_INPUT_DATA',
  'MISTAKEN_IDENTITY',
  'FALSE_MATCH',
  'INAPPROPRIATE_CLASSIFICATION',
  'UNEXPLAINED_SCORE',
  'INCONSISTENT_RECOMMENDATION',
  'IRRELEVANT_DATA',
  'BIASED_OR_DISCRIMINATORY_EFFECT',
  'OUTDATED_SOURCE',
  'UNSUPPORTED_INFERENCE',
  'MISSING_HUMAN_REVIEW',
  'OUTSIDE_APPROVED_AUTOMATION_BOUNDARY',
  'OTHER_AUTHORIZED_GROUND',
] as const;

export const AUTOMATION_CHALLENGE_REMEDIES = [
  'CORRECT_INPUT',
  'RERUN_AUTHORIZED_PROCESS',
  'EXCLUDE_FAULTY_OUTPUT',
  'REQUIRE_HUMAN_REVIEW',
  'REOPEN_REVIEW',
  'REFER_FOR_RECONSIDERATION',
  'NO_DEFECT_FOUND',
  'OTHER_AUTHORIZED_REMEDY',
] as const;

export const CLARIFICATION_FORBIDDEN_RESPONSE_FIELDS = [
  'newDecisionReasons',
  'outcomeChange',
  'conditionChange',
  'inventedAuthority',
  'reconsiderationReplacement',
] as const;

export const REDRESS_ROUTE_TYPES = [
  'ADMINISTRATIVE_CORRECTION',
  'CLARIFICATION',
  'RECONSIDERATION',
  'INTERNAL_REVIEW',
  'STATUTORY_APPEAL',
  'AUTOMATION_CHALLENGE',
] as const;

export const DEFAULT_SUBSTANTIVE_REDRESS_ROUTE = 'RECONSIDERATION';
