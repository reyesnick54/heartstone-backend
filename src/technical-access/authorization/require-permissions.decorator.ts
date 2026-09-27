import { SetMetadata } from '@nestjs/common';

import { type PermissionScopeBinding } from '../types/permission-scope.types';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export interface RequirePermissionsMetadata {
  permissions: readonly string[];
  requireAll?: boolean;
  scope?: PermissionScopeBinding;
}

export const RequirePermissions = (
  permissions: string | readonly string[],
  options?: Omit<RequirePermissionsMetadata, 'permissions'>,
) => {
  const list = typeof permissions === 'string' ? [permissions] : permissions;
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, {
    permissions: list,
    requireAll: options?.requireAll ?? true,
    scope: options?.scope,
  } satisfies RequirePermissionsMetadata);
};
