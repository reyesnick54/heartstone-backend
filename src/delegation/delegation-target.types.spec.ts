import {
  countDelegationTargets,
  delegationTargetsAreSame,
  resolveDelegationTarget,
} from './delegation-target.types';

describe('delegation-target.types', () => {
  it('counts delegation targets', () => {
    expect(countDelegationTargets({})).toBe(0);
    expect(countDelegationTargets({ institutionId: 'a' })).toBe(1);
    expect(countDelegationTargets({ institutionId: 'a', officeId: 'b' })).toBe(2);
  });

  it('resolves a single target', () => {
    expect(resolveDelegationTarget({ officeholderId: 'h1' })).toEqual({
      type: 'officeholder',
      id: 'h1',
    });
  });

  it('detects self-delegation', () => {
    const target = { type: 'office' as const, id: 'office-1' };
    expect(delegationTargetsAreSame(target, target)).toBe(true);
    expect(
      delegationTargetsAreSame(
        { type: 'office', id: 'office-1' },
        { type: 'institution', id: 'office-1' },
      ),
    ).toBe(false);
  });
});
