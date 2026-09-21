import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { type ConsequentialActionDenial } from './consequential-action.types';

/**
 * Produces audit-safe denial metadata without leaking restricted governing material.
 */
export function buildConsequentialActionDenial(
  evaluation: AuthorityEvaluationResponseDto,
  message = 'Consequential action blocked: authority evaluation did not permit this action.',
): ConsequentialActionDenial {
  return {
    message,
    outcome: evaluation.outcome,
    status: evaluation.status,
    explanationCodes: evaluation.explanationCodes,
    evaluationId: evaluation.evaluationId,
    summary: evaluation.summary,
    safeHalt: evaluation.safeHalt,
    requiresRevalidation: evaluation.requiresRevalidation,
  };
}
