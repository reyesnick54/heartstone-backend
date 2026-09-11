import {
  GOVERNMENT_ACTION_ORDER,
  GovernmentActionType,
  isDistinctAction,
} from './government-action.enum';

describe('GovernmentActionType action separation', () => {
  it('defines six distinct non-substitutable actions', () => {
    expect(GOVERNMENT_ACTION_ORDER).toHaveLength(6);
    const unique = new Set(GOVERNMENT_ACTION_ORDER);
    expect(unique.size).toBe(6);
  });

  it('maintains PREPARE != REVIEW != RECOMMEND != DECIDE != SIGN != ISSUE', () => {
    expect(isDistinctAction(GovernmentActionType.PREPARE, GovernmentActionType.REVIEW)).toBe(true);
    expect(isDistinctAction(GovernmentActionType.REVIEW, GovernmentActionType.RECOMMEND)).toBe(
      true,
    );
    expect(isDistinctAction(GovernmentActionType.RECOMMEND, GovernmentActionType.DECIDE)).toBe(true);
    expect(isDistinctAction(GovernmentActionType.DECIDE, GovernmentActionType.SIGN)).toBe(true);
    expect(isDistinctAction(GovernmentActionType.SIGN, GovernmentActionType.ISSUE)).toBe(true);
  });

  it('does not treat identical actions as distinct', () => {
    expect(isDistinctAction(GovernmentActionType.DECIDE, GovernmentActionType.DECIDE)).toBe(false);
  });
});
