import { AuthorityActionType } from '@prisma/client';

import { matchesDelegationStructuredScope } from './delegation-scope.util';

describe('matchesDelegationStructuredScope', () => {
  const functionId = 'function-1';

  it('matches when function and action are allowed', () => {
    expect(
      matchesDelegationStructuredScope(
        {
          functionAuthorityRecordId: functionId,
          allowedActionTypes: [AuthorityActionType.DECIDE, AuthorityActionType.SIGN],
        },
        functionId,
        AuthorityActionType.DECIDE,
      ),
    ).toBe(true);
  });

  it('rejects action types not explicitly delegated', () => {
    expect(
      matchesDelegationStructuredScope(
        {
          functionAuthorityRecordId: functionId,
          allowedActionTypes: [AuthorityActionType.SIGN],
        },
        functionId,
        AuthorityActionType.DECIDE,
      ),
    ).toBe(false);
  });
});
