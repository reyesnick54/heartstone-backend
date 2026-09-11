import { type AuthorityActionType } from '@prisma/client';

export interface DelegationStructuredScopeFields {
  functionAuthorityRecordId: string;
  allowedActionTypes: AuthorityActionType[];
}

export function matchesDelegationStructuredScope(
  scope: DelegationStructuredScopeFields,
  functionAuthorityRecordId: string,
  requestedAction: AuthorityActionType,
): boolean {
  if (scope.functionAuthorityRecordId !== functionAuthorityRecordId) {
    return false;
  }

  return scope.allowedActionTypes.includes(requestedAction);
}
