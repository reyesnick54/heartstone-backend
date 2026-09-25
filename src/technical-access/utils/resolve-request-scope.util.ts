import { TechnicalAccessScopeType } from '@prisma/client';

import {
  type PermissionScopeBinding,
  type RequestPermissionScope,
} from '../types/permission-scope.types';

export function resolveRequestPermissionScope(
  binding: PermissionScopeBinding | undefined,
  params: Record<string, string> | undefined,
): RequestPermissionScope {
  if (!binding || !params) {
    return {};
  }

  const scope: RequestPermissionScope = {};

  if (binding.institutionIdParam && params[binding.institutionIdParam]) {
    scope.institutionId = params[binding.institutionIdParam];
    scope.scopeType = TechnicalAccessScopeType.INSTITUTION;
  }
  if (binding.jurisdictionIdParam && params[binding.jurisdictionIdParam]) {
    scope.jurisdictionId = params[binding.jurisdictionIdParam];
    scope.scopeType = TechnicalAccessScopeType.JURISDICTION;
  }
  if (binding.governmentBodyIdParam && params[binding.governmentBodyIdParam]) {
    scope.governmentBodyId = params[binding.governmentBodyIdParam];
    scope.scopeType = TechnicalAccessScopeType.GOVERNMENT_BODY;
  }
  if (binding.departmentIdParam && params[binding.departmentIdParam]) {
    scope.departmentId = params[binding.departmentIdParam];
    scope.scopeType = TechnicalAccessScopeType.DEPARTMENT;
  }
  if (binding.officeIdParam && params[binding.officeIdParam]) {
    scope.officeId = params[binding.officeIdParam];
    scope.scopeType = TechnicalAccessScopeType.OFFICE;
  }

  return scope;
}
