import {
  normalizeApiPath,
  resolveAdministrativeRoutePermission,
} from './administrative-route-permissions';
import { TECHNICAL_PERMISSION } from './technical-permission/technical-permission.constants';

describe('administrative-route-permissions', () => {
  it('normalizes global api prefix', () => {
    expect(normalizeApiPath('/api/v1/institutions')).toBe('/institutions');
    expect(normalizeApiPath('/institutions')).toBe('/institutions');
  });

  it('resolves government structure administration', () => {
    const resolved = resolveAdministrativeRoutePermission('/api/v1/appointments');
    expect(resolved?.rule.permissionCode).toBe(TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN);
  });

  it('resolves identity administration', () => {
    const resolved = resolveAdministrativeRoutePermission('/api/v1/identity/user-accounts');
    expect(resolved?.rule.permissionCode).toBe(TECHNICAL_PERMISSION.IDENTITY_ADMIN);
  });

  it('does not classify citizen self-service routes as administrative', () => {
    expect(resolveAdministrativeRoutePermission('/api/v1/identity/me')).toBeUndefined();
    expect(resolveAdministrativeRoutePermission('/api/v1/applications')).toBeUndefined();
  });
});
