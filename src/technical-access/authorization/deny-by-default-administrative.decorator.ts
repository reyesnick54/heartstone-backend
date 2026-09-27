import { SetMetadata } from '@nestjs/common';

export const DENY_BY_DEFAULT_ADMINISTRATIVE_KEY = 'deny_by_default_administrative';

/**
 * Marks a controller or handler as a protected administrative capability.
 * Without explicit {@link RequirePermissions}, access is denied.
 */
export const DenyByDefaultAdministrative = () =>
  SetMetadata(DENY_BY_DEFAULT_ADMINISTRATIVE_KEY, true);
