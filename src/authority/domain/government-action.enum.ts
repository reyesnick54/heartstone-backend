import { GovernmentAction } from '@prisma/client';

/**
 * Explicit action separation: each action is distinct and non-substitutable.
 * PREPARE != REVIEW != RECOMMEND != DECIDE != SIGN != ISSUE
 */
export { GovernmentAction as GovernmentActionType };

export const GOVERNMENT_ACTION_ORDER: readonly GovernmentAction[] = [
  GovernmentAction.PREPARE,
  GovernmentAction.REVIEW,
  GovernmentAction.RECOMMEND,
  GovernmentAction.DECIDE,
  GovernmentAction.SIGN,
  GovernmentAction.ISSUE,
];

export function isDistinctAction(
  attempted: GovernmentAction,
  required: GovernmentAction,
): boolean {
  return attempted !== required;
}
