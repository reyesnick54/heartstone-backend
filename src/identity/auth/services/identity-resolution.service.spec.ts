import { AssuranceLevel, AuthenticationMethodType, IdentityType } from '@prisma/client';

import { IdentityResolutionService } from './identity-resolution.service';

describe('IdentityResolutionService', () => {
  const service = new IdentityResolutionService();

  it('resolves only identity facts and no authority conclusions', () => {
    const authenticatedAt = new Date();
    const principal = service.resolveFromSession({
      id: 'session-1',
      identityId: 'identity-1',
      userAccountId: 'account-1',
      tokenHash: 'hash',
      status: 'ACTIVE',
      assuranceLevel: AssuranceLevel.LOW,
      authMethod: AuthenticationMethodType.PASSWORD,
      oidcProviderCode: null,
      mfaSatisfied: false,
      authenticatedAt,
      issuedAt: new Date(),
      expiresAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      revocationReason: null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: { type: IdentityType.INDIVIDUAL },
    });

    expect(principal).toEqual({
      sessionId: 'session-1',
      identityId: 'identity-1',
      userAccountId: 'account-1',
      assuranceLevel: AssuranceLevel.LOW,
      authMethod: AuthenticationMethodType.PASSWORD,
      mfaSatisfied: false,
      authenticatedAt,
      oidcProviderCode: null,
      identityType: IdentityType.INDIVIDUAL,
      isServicePrincipal: false,
    });

    expect(principal).not.toHaveProperty('canApproveLicense');
    expect(principal).not.toHaveProperty('hasGovernmentAuthority');
    expect(principal).not.toHaveProperty('canIssuePermit');
    expect(principal).not.toHaveProperty('isDecisionMaker');
  });
});
