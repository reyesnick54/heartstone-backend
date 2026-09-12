export const CASE_NUMBER_PREFIX = 'CASE';

/** Statuses that require the Decision Engine and cannot be set via ordinary status patch. */
export const DECISION_ENGINE_OWNED_CASE_STATUSES = ['DECIDED', 'ISSUED'] as const;

export type DecisionEngineOwnedCaseStatus = (typeof DECISION_ENGINE_OWNED_CASE_STATUSES)[number];
