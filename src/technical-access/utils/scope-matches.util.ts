import { TechnicalAccessScopeType } from '@prisma/client';

import { type RequestPermissionScope } from '../types/permission-scope.types';

export interface AssignmentScopeSnapshot {
  scopeType: TechnicalAccessScopeType;
  jurisdictionId?: string | null;
  institutionId?: string | null;
  governmentBodyId?: string | null;
  departmentId?: string | null;
  officeId?: string | null;
}

export function assignmentScopeMatchesRequest(
  assignment: AssignmentScopeSnapshot,
  requestScope: RequestPermissionScope,
): boolean {
  if (assignment.scopeType === TechnicalAccessScopeType.PLATFORM) {
    return true;
  }

  if (!requestScope.scopeType && !hasAnyScopeId(requestScope)) {
    return true;
  }

  switch (assignment.scopeType) {
    case TechnicalAccessScopeType.JURISDICTION:
      return (
        !requestScope.jurisdictionId ||
        assignment.jurisdictionId === requestScope.jurisdictionId
      );
    case TechnicalAccessScopeType.INSTITUTION:
      return (
        !requestScope.institutionId || assignment.institutionId === requestScope.institutionId
      );
    case TechnicalAccessScopeType.GOVERNMENT_BODY:
      return (
        !requestScope.governmentBodyId ||
        assignment.governmentBodyId === requestScope.governmentBodyId
      );
    case TechnicalAccessScopeType.DEPARTMENT:
      return (
        !requestScope.departmentId || assignment.departmentId === requestScope.departmentId
      );
    case TechnicalAccessScopeType.OFFICE:
      return !requestScope.officeId || assignment.officeId === requestScope.officeId;
    default:
      return false;
  }
}

function hasAnyScopeId(scope: RequestPermissionScope): boolean {
  return Boolean(
    scope.jurisdictionId ??
      scope.institutionId ??
      scope.governmentBodyId ??
      scope.departmentId ??
      scope.officeId,
  );
}
