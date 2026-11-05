import {
  AccountStatus,
  AssuranceLevel,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { type PrismaService } from '../../../database/prisma.service';
import { type SecurityAuditService } from '../../audit/security-audit.service';
import {
  buildProvisionedLoginIdentifier,
  hashExternalSubject,
  OIDC_PROVISIONING_REFUSAL_REASONS,
  OidcCitizenProvisioningService,
  SELF_PROVISIONED_FALLBACK_DISPLAY_NAME,
} from './oidc-citizen-provisioning.service';
import { type MappedOidcClaims } from './types/mapped-oidc-claims';

function buildClaims(overrides: Partial<MappedOidcClaims> = {}): MappedOidcClaims {
  return {
    issuer: 'https://issuer.test',
    subject: 'citizen-sub-1',
    audience: 'heartstone-api',
    providerCode: 'test-idp',
    authenticationMethod: AuthenticationMethodType.OIDC,
    authenticatedAt: new Date(),
    assuranceLevel: AssuranceLevel.MEDIUM,
    mfaSatisfied: false,
    amr: ['pwd'],
    externalContext: {},
    profile: { emailVerified: false },
    ...overrides,
  };
}

function createTx() {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    credential: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'cred-1' }),
    },
    userAccount: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'account-1' }),
    },
    person: { create: jest.fn().mockResolvedValue({ id: 'person-1' }) },
    identity: {
      create: jest.fn().mockResolvedValue({ id: 'identity-1', type: IdentityType.INDIVIDUAL }),
    },
    authenticationMethod: { create: jest.fn().mockResolvedValue({ id: 'method-1' }) },
    technicalRoleAssignment: { create: jest.fn() },
    identityOfficeholderLink: { create: jest.fn() },
    organizationMembership: { create: jest.fn() },
    representativeAuthority: { create: jest.fn() },
  };
}

describe('OidcCitizenProvisioningService', () => {
  let tx: ReturnType<typeof createTx>;
  let audit: { recordWithinTransaction: jest.Mock; record: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let service: OidcCitizenProvisioningService;

  beforeEach(() => {
    tx = createTx();
    audit = { recordWithinTransaction: jest.fn().mockResolvedValue({}), record: jest.fn() };
    prisma = {
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    service = new OidcCitizenProvisioningService(
      prisma as unknown as PrismaService,
      audit as unknown as SecurityAuditService,
    );
  });

  it('creates person, account, identity and an active OIDC link in one transaction', async () => {
    const claims = buildClaims({
      profile: {
        givenName: 'Ada',
        familyName: 'Citizen',
        name: 'Ada Citizen',
        emailVerified: true,
      },
    });

    const outcome = await service.provision(claims, { ipAddress: '203.0.113.5' });

    expect(outcome).toEqual({
      status: 'PROVISIONED',
      identity: {
        identityId: 'identity-1',
        userAccountId: 'account-1',
        personId: 'person-1',
        identityType: IdentityType.INDIVIDUAL,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.person.create).toHaveBeenCalledWith({
      data: { givenName: 'Ada', familyName: 'Citizen', displayName: 'Ada Citizen' },
    });
    expect(tx.userAccount.create).toHaveBeenCalledWith({
      data: {
        loginIdentifier: 'test-idp:citizen-sub-1',
        personId: 'person-1',
        status: AccountStatus.ACTIVE,
      },
    });
    expect(tx.identity.create).toHaveBeenCalledWith({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Ada Citizen',
        userAccountId: 'account-1',
        personId: 'person-1',
      },
    });
    expect(tx.credential.create).toHaveBeenCalledWith({
      data: {
        identityId: 'identity-1',
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: 'test-idp',
        oidcSubject: 'citizen-sub-1',
      },
    });
    expect(tx.authenticationMethod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identityId: 'identity-1',
        type: AuthenticationMethodType.OIDC,
        oidcIssuer: 'https://issuer.test',
      }) as unknown,
    });
  });

  it('assigns no roles, offices, memberships or representative authority', async () => {
    await service.provision(buildClaims());

    expect(tx.technicalRoleAssignment.create).not.toHaveBeenCalled();
    expect(tx.identityOfficeholderLink.create).not.toHaveBeenCalled();
    expect(tx.organizationMembership.create).not.toHaveBeenCalled();
    expect(tx.representativeAuthority.create).not.toHaveBeenCalled();
  });

  it('records IDENTITY_SELF_PROVISIONED with a subject hash and no raw subject or token', async () => {
    const claims = buildClaims();
    await service.provision(claims, { ipAddress: '203.0.113.5' });

    expect(audit.recordWithinTransaction).toHaveBeenCalledTimes(1);
    const [txArg, event] = audit.recordWithinTransaction.mock.calls[0] as [
      unknown,
      { eventType: string; identityId: string; metadata: Record<string, unknown> },
    ];
    expect(txArg).toBe(tx);
    expect(event.eventType).toBe('IDENTITY_SELF_PROVISIONED');
    expect(event.identityId).toBe('identity-1');
    expect(event.metadata.providerCode).toBe('test-idp');
    expect(event.metadata.subjectHash).toBe(hashExternalSubject('test-idp', 'citizen-sub-1'));
    expect(event.metadata.grantedTechnicalRoles).toEqual([]);
    expect(JSON.stringify(event)).not.toContain('citizen-sub-1');
  });

  it('uses a neutral display name and empty person names when the IdP sends none', async () => {
    await service.provision(buildClaims({ profile: undefined }));

    expect(tx.person.create).toHaveBeenCalledWith({
      data: { givenName: '', familyName: '', displayName: undefined },
    });
    expect(tx.identity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: SELF_PROVISIONED_FALLBACK_DISPLAY_NAME,
      }) as unknown,
    });
  });

  it('returns ALREADY_LINKED without creating anything when an active link exists', async () => {
    tx.credential.findMany.mockResolvedValue([{ status: CredentialStatus.ACTIVE }]);

    const outcome = await service.provision(buildClaims());

    expect(outcome).toEqual({ status: 'ALREADY_LINKED' });
    expect(tx.person.create).not.toHaveBeenCalled();
    expect(tx.userAccount.create).not.toHaveBeenCalled();
    expect(audit.recordWithinTransaction).not.toHaveBeenCalled();
  });

  it('refuses when an administrator revoked the link for this subject', async () => {
    tx.credential.findMany.mockResolvedValue([{ status: CredentialStatus.REVOKED }]);

    const outcome = await service.provision(buildClaims());

    expect(outcome).toEqual({
      status: 'REFUSED',
      reason: OIDC_PROVISIONING_REFUSAL_REASONS.PRIOR_LINK_NOT_ACTIVE,
    });
    expect(tx.person.create).not.toHaveBeenCalled();
  });

  it('refuses when the provider-scoped login identifier already exists without a link', async () => {
    tx.userAccount.findUnique.mockResolvedValue({ id: 'orphan-account' });

    const outcome = await service.provision(buildClaims());

    expect(outcome).toEqual({
      status: 'REFUSED',
      reason: OIDC_PROVISIONING_REFUSAL_REASONS.LOGIN_IDENTIFIER_TAKEN,
    });
    expect(tx.person.create).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race to ALREADY_LINKED', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.provision(buildClaims())).resolves.toEqual({ status: 'ALREADY_LINKED' });
  });

  it('rethrows other database errors', async () => {
    prisma.$transaction.mockRejectedValue(new Error('connection lost'));

    await expect(service.provision(buildClaims())).rejects.toThrow('connection lost');
  });

  it('never links or merges by email; a matching account only raises a duplicate audit event', async () => {
    tx.userAccount.findMany.mockResolvedValue([{ id: 'existing-account' }]);
    const claims = buildClaims({
      profile: { email: 'ada@example.org', emailVerified: false },
    });

    const outcome = await service.provision(claims);

    expect(outcome.status).toBe('PROVISIONED');
    expect(tx.userAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        loginIdentifier: buildProvisionedLoginIdentifier('test-idp', 'citizen-sub-1'),
      }) as unknown,
    });
    expect(tx.credential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ identityId: 'identity-1' }) as unknown,
    });

    const eventTypes = audit.recordWithinTransaction.mock.calls.map(
      ([, event]) => (event as { eventType: string }).eventType,
    );
    expect(eventTypes).toEqual(['IDENTITY_SELF_PROVISIONED', 'IDENTITY_POSSIBLE_DUPLICATE']);

    const calls = audit.recordWithinTransaction.mock.calls as [
      unknown,
      { metadata: Record<string, unknown> },
    ][];
    const duplicate = calls[1]?.[1];
    if (!duplicate) {
      throw new Error('expected a duplicate audit event');
    }
    expect(duplicate.metadata.matchedUserAccountIds).toEqual(['existing-account']);
    expect(duplicate.metadata.resolution).toBe('NOT_MERGED_REQUIRES_REVIEW');
  });

  it('does not look up duplicates when no email claim is present', async () => {
    await service.provision(buildClaims());

    expect(tx.userAccount.findMany).not.toHaveBeenCalled();
  });
});
