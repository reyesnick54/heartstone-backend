import { AuthorityEvaluationOutcome } from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { AuthorityEvaluationStatus } from './authority-evaluation-status.enum';

const BLOCKED_CODES = new Set<string>([
  AUTHORITY_EVALUATION_EXPLANATION_CODES.PROHIBITED_FUNCTION,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_FUNCTION,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.CONFLICT_DETECTED,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.RECUSAL_REQUIRED,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.SOD_VIOLATION,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT,
]);

const PROFESSIONAL_REVIEW_CODES = new Set<string>([
  AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_QUALIFICATION,
]);

const HUMAN_REVIEW_CODES = new Set<string>([
  AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_DECIDE,
  AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL,
]);

export function deriveEvaluationStatus(
  outcome: AuthorityEvaluationOutcome,
  explanationCodes: string[],
): AuthorityEvaluationStatus {
  if (outcome === AuthorityEvaluationOutcome.ALLOW) {
    return AuthorityEvaluationStatus.ALLOW;
  }

  if (outcome === AuthorityEvaluationOutcome.SAFE_HALT) {
    return AuthorityEvaluationStatus.SAFE_HALT;
  }

  if (outcome === AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION) {
    return AuthorityEvaluationStatus.REQUIRES_EXTERNAL_DETERMINATION;
  }

  if (explanationCodes.some((code) => PROFESSIONAL_REVIEW_CODES.has(code))) {
    return AuthorityEvaluationStatus.REQUIRES_PROFESSIONAL_REVIEW;
  }

  if (explanationCodes.some((code) => HUMAN_REVIEW_CODES.has(code))) {
    return AuthorityEvaluationStatus.REQUIRES_HUMAN_REVIEW;
  }

  if (explanationCodes.some((code) => BLOCKED_CODES.has(code))) {
    return AuthorityEvaluationStatus.BLOCKED;
  }

  return AuthorityEvaluationStatus.NOT_AUTHORIZED;
}
