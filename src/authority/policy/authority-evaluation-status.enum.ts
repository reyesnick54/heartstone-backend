/**
 * Phase 4F structured evaluation status for API consumers.
 * Maps from persisted AuthorityEvaluationOutcome plus explanation codes.
 */
export enum AuthorityEvaluationStatus {
  ALLOW = 'ALLOW',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  BLOCKED = 'BLOCKED',
  REQUIRES_EXTERNAL_DETERMINATION = 'REQUIRES_EXTERNAL_DETERMINATION',
  REQUIRES_PROFESSIONAL_REVIEW = 'REQUIRES_PROFESSIONAL_REVIEW',
  REQUIRES_HUMAN_REVIEW = 'REQUIRES_HUMAN_REVIEW',
  SAFE_HALT = 'SAFE_HALT',
}
