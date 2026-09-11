/**
 * Technical authority evaluation outcomes.
 * These are authorization-layer results, not applicant-facing refusals.
 */
export enum AuthorityEvaluationOutcome {
  ALLOW = 'ALLOW',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  BLOCKED = 'BLOCKED',
  SAFE_HALT = 'SAFE_HALT',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}
