import { TechnicalAccessLevel } from '@prisma/client';

import { PermissionCodes } from '../constants/permission-codes.constants';
import { ACCESS_LEVEL_PERMISSIONS } from './access-level-policy.config';

describe('Access level policy configuration', () => {
  it('maps level B to self-service read only', () => {
    expect(ACCESS_LEVEL_PERMISSIONS[TechnicalAccessLevel.B]).toEqual([
      PermissionCodes.IDENTITY_SELF_READ,
    ]);
  });

  it('expands higher levels without shrinking lower bundles', () => {
    const c = ACCESS_LEVEL_PERMISSIONS[TechnicalAccessLevel.C];
    const e = ACCESS_LEVEL_PERMISSIONS[TechnicalAccessLevel.E];
    for (const code of c) {
      expect(e).toContain(code);
    }
  });

  it('includes activation-class permissions only at level F', () => {
    expect(ACCESS_LEVEL_PERMISSIONS[TechnicalAccessLevel.E]).not.toContain(
      PermissionCodes.CONFIGURATION_ACTIVATE,
    );
    expect(ACCESS_LEVEL_PERMISSIONS[TechnicalAccessLevel.F]).toContain(
      PermissionCodes.CONFIGURATION_ACTIVATE,
    );
  });
});
