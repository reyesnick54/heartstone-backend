import { AssuranceLevel } from '@prisma/client';

import { TEST_OIDC_PROVIDER } from '../../../../test/helpers/oidc-test-fixtures';
import { ClaimMapperService } from './claim-mapper.service';

describe('ClaimMapperService', () => {
  const mapper = new ClaimMapperService();

  it('maps OIDC claims with MFA assurance', () => {
    const mapped = mapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'user-1',
      aud: TEST_OIDC_PROVIDER.audience,
      amr: ['pwd', 'mfa'],
    });

    expect(mapped.mfaSatisfied).toBe(true);
    expect(mapped.assuranceLevel).toBe(AssuranceLevel.HIGH);
    expect(mapped.externalContext).toEqual({});
  });

  it('stores external roles in context only', () => {
    const mapped = mapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'admin-user',
      aud: TEST_OIDC_PROVIDER.audience,
      roles: ['admin', 'officer'],
    });

    expect(mapped.externalContext.roles).toEqual(['admin', 'officer']);
    expect(mapped).not.toHaveProperty('legalAuthority');
  });
});
