import { UnauthorizedException } from '@nestjs/common';
import {
  AccountStatus,
  AssuranceLevel,
  AuthenticationMethodType,
  IdentityType,
} from '@prisma/client';

import { type OidcProviderConfig } from '../../../config/config.constants';
import { type PrismaService } from '../../../database/prisma.service';
import { type SecurityAuditService } from '../../audit/security-audit.service';
import { type OidcCitizenProvisioningService } from './oidc-citizen-provisioning.service';
import { OidcIdentityResolverService } from './oidc-identity-resolver.service';
import { type MappedOidcClaims } from './types/mapped-oidc-claims';

const BASE_PROVIDER: OidcProviderConfig = {
  code: 'test-idp',
  name: 'Test IdP',
  issuer: 'https://issuer.test',
  audience: 'heartstone-api',
  jwksUri: 'https://issuer.test/jwks',
  allowedAlgorithms: ['RS256'],
};

const SELF_SERVICE_PROVIDER: OidcProviderConfig = {
  ...BASE_PROVIDER,
  provisioning: { citizenSelfService: true },
};

const claims: MappedOidcClaims = {
  issuer: 'https://issuer.test',
  subject: 'sub-1',
  audience: 'heartstone-api',
  providerCode: 'test-idp',
  authenticationMethod: AuthenticationMethodType.OIDC,
  authenticatedAt: new Date(),
  assuranceLevel: AssuranceLevel.MEDIUM,
  mfaSatisfied: false,
  amr: ['pwd'],
  externalContext: {},
};

function linkedCredential(status: AccountStatus = AccountStatus.ACTIVE) {
  return {
    id: 'cred-1',
    identity: {
      id: 'identity-1',
      type: IdentityType.INDIVIDUAL,
      userAccountId: 'account-1',
      personId: 'person-1',
      organizationId: null,
      userAccount: { id: 'account-1', status },
    },
  };
}

describe('OidcIdentityResolverService', () => {
  let prisma: { credential: { findFirst: jest.Mock } };
  let audit: { record: jest.Mock };
  let provisioning: { provision: jest.Mock };
  let resolver: OidcIdentityResolverService;

  beforeEach(() => {
    prisma = { credential: { findFirst: jest.fn().mockResolvedValue(null) } };
    audit = { record: jest.fn().mockResolvedValue({}) };
    provisioning = { provision: jest.fn() };
    resolver = new OidcIdentityResolverService(
      prisma as unknown as PrismaService,
      audit as unknown as SecurityAuditService,
      provisioning as unknown as OidcCitizenProvisioningService,
    );
  });

  it('resolves an existing link without provisioning', async () => {
    prisma.credential.findFirst.mockResolvedValue(linkedCredential());

    const resolved = await resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER });

    expect(resolved).toMatchObject({ identityId: 'identity-1', isNewLink: false });
    expect(provisioning.provision).not.toHaveBeenCalled();
  });

  it('still rejects an unlinked subject when the provider has not opted in', async () => {
    await expect(resolver.resolveIdentity(claims, { provider: BASE_PROVIDER })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(provisioning.provision).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTHENTICATION_REJECTED',
        metadata: expect.objectContaining({ reason: 'no_linked_identity' }) as unknown,
      }),
    );
  });

  it('rejects an unlinked subject when provisioning is explicitly disabled', async () => {
    await expect(
      resolver.resolveIdentity(claims, {
        provider: { ...BASE_PROVIDER, provisioning: { citizenSelfService: false } },
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(provisioning.provision).not.toHaveBeenCalled();
  });

  it('rejects an unlinked subject when no provider is supplied', async () => {
    await expect(resolver.resolveIdentity(claims)).rejects.toThrow(UnauthorizedException);
    expect(provisioning.provision).not.toHaveBeenCalled();
  });

  it('provisions a new link on first login for an opted-in provider', async () => {
    provisioning.provision.mockResolvedValue({
      status: 'PROVISIONED',
      identity: {
        identityId: 'new-identity',
        userAccountId: 'new-account',
        personId: 'new-person',
        identityType: IdentityType.INDIVIDUAL,
      },
    });

    const resolved = await resolver.resolveIdentity(claims, {
      provider: SELF_SERVICE_PROVIDER,
      ipAddress: '203.0.113.5',
    });

    expect(provisioning.provision).toHaveBeenCalledWith(claims, { ipAddress: '203.0.113.5' });
    expect(resolved).toEqual({
      identityId: 'new-identity',
      userAccountId: 'new-account',
      personId: 'new-person',
      organizationId: null,
      identityType: IdentityType.INDIVIDUAL,
      isNewLink: true,
    });
  });

  it('is idempotent: a second login resolves the link created by the first', async () => {
    prisma.credential.findFirst.mockResolvedValueOnce(null);
    provisioning.provision.mockResolvedValueOnce({
      status: 'PROVISIONED',
      identity: {
        identityId: 'identity-1',
        userAccountId: 'account-1',
        personId: 'person-1',
        identityType: IdentityType.INDIVIDUAL,
      },
    });
    const first = await resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER });

    prisma.credential.findFirst.mockResolvedValueOnce(linkedCredential());
    const second = await resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER });

    expect(first.identityId).toBe('identity-1');
    expect(second).toMatchObject({ identityId: 'identity-1', isNewLink: false });
    expect(provisioning.provision).toHaveBeenCalledTimes(1);
  });

  it('resolves the concurrent winner when provisioning reports ALREADY_LINKED', async () => {
    prisma.credential.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(linkedCredential());
    provisioning.provision.mockResolvedValue({ status: 'ALREADY_LINKED' });

    const resolved = await resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER });

    expect(resolved).toMatchObject({ identityId: 'identity-1', isNewLink: false });
  });

  it('applies account status checks to the concurrent winner', async () => {
    prisma.credential.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(linkedCredential(AccountStatus.SUSPENDED));
    provisioning.provision.mockResolvedValue({ status: 'ALREADY_LINKED' });

    await expect(
      resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects and audits the reason when provisioning is refused', async () => {
    provisioning.provision.mockResolvedValue({
      status: 'REFUSED',
      reason: 'prior_link_not_active',
    });

    await expect(
      resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER }),
    ).rejects.toThrow(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTHENTICATION_REJECTED',
        metadata: expect.objectContaining({ reason: 'prior_link_not_active' }) as unknown,
      }),
    );
  });

  it('still rejects suspended accounts on an opted-in provider', async () => {
    prisma.credential.findFirst.mockResolvedValue(linkedCredential(AccountStatus.SUSPENDED));

    await expect(
      resolver.resolveIdentity(claims, { provider: SELF_SERVICE_PROVIDER }),
    ).rejects.toThrow('Invalid credentials');
    expect(provisioning.provision).not.toHaveBeenCalled();
  });
});
