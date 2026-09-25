import { type AuthorityActionType } from '@prisma/client';

/**
 * Explicit allowlist of non-human-permitted consequential actions.
 * All final human-reserved actions fail closed unless listed here.
 */
export const NON_HUMAN_ALLOWED_CONSEQUENTIAL_ACTIONS: ReadonlySet<AuthorityActionType> =
  new Set([]);

/** Route keys (METHOD + space + path) where non-human identities may invoke mutating handlers. */
export const NON_HUMAN_ALLOWED_MUTATION_ROUTE_KEYS: ReadonlySet<string> = new Set([
  'POST /evidence/records/:id/quality-assessments/ai-proposals',
  'POST /intelligence/consequential-use/reviews',
]);

export function buildRouteKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

export function isNonHumanMutationAllowed(method: string, path: string): boolean {
  return NON_HUMAN_ALLOWED_MUTATION_ROUTE_KEYS.has(buildRouteKey(method, path));
}

export function isNonHumanConsequentialActionAllowed(action: AuthorityActionType): boolean {
  return NON_HUMAN_ALLOWED_CONSEQUENTIAL_ACTIONS.has(action);
}
