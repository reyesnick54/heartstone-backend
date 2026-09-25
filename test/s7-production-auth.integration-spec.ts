import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  AssuranceLevel,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityType,
  SessionStatus,
} from '@prisma/client';

import appConfig from '../src/config/app.config';
import identityConfig from '../src/config/identity.config';
import oidcConfig from '../src/config/oidc.config';
import redisConfig from '../src/config/redis.config';
import securityConfig from '../src/config/security.config';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { ClaimMapperService } from '../src/identity/auth/oidc/claim-mapper.service';
import { OidcIdentityResolverService } from '../src/identity/auth/oidc/oidc-identity-resolver.service';
import { IdentityModule } from '../src/identity/identity.module';
import { SessionsService } from '../src/identity/sessions/sessions.service';
import { TEST_OIDC_PROVIDER } from './helpers/oidc-test-fixtures';

const S7_TEST_LOGIN_IDENTIFIERS = [
  'lockout@test.gov',
  'sessions@test.gov',
  'suspended@test.gov',
  'mfa@test.gov',
] as const;

describe('S7 production authentication boundary (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let sessions: SessionsService;
  let oidcIdentityResolver: OidcIdentityResolverService;
  let claimMapper: ClaimMapperService;

  async function resetS7Fixtures(): Promise<void> {
    const accounts = await prisma.userAccount.findMany({
      where: { loginIdentifier: { in: [...S7_TEST_LOGIN_IDENTIFIERS] } },
      select: { id: true, personId: true },
    });
    const accountIds = accounts.map((account) => account.id);
    const identities = await prisma.identity.findMany({
      where: { userAccountId: { in: accountIds } },
      select: { id: true },
    });
    const identityIds = identities.map((identity) => identity.id);
    const personIds = accounts.map((account) => account.personId).filter(Boolean) as string[];

    if (identityIds.length > 0) {
      await prisma.securityAuditEvent.deleteMany({ where: { identityId: { in: identityIds } } });
      await prisma.session.deleteMany({ where: { identityId: { in: identityIds } } });
      await prisma.credential.deleteMany({ where: { identityId: { in: identityIds } } });
      await prisma.identity.deleteMany({ where: { id: { in: identityIds } } });
    }

    if (accountIds.length > 0) {
      await prisma.userAccount.deleteMany({ where: { id: { in: accountIds } } });
    }

    if (personIds.length > 0) {
      await prisma.person.deleteMany({ where: { id: { in: personIds } } });
    }
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig, oidcConfig],
        }),
        DatabaseModule,
        IdentityModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    sessions = moduleRef.get(SessionsService);
    oidcIdentityResolver = moduleRef.get(OidcIdentityResolverService);
    claimMapper = moduleRef.get(ClaimMapperService);
  });

  beforeEach(async () => {
    await resetS7Fixtures();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function provisionPasswordUser(loginIdentifier: string, password: string) {
    const person = await prisma.person.create({
      data: { givenName: 'S7', familyName: 'User' },
    });
    const account = await prisma.userAccount.create({
      data: { loginIdentifier, personId: person.id, status: AccountStatus.ACTIVE },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: loginIdentifier,
        userAccountId: account.id,
        personId: person.id,
      },
    });
    const { hashSecret } = await import('../src/identity/common/crypto.util');
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.PASSWORD,
        status: CredentialStatus.ACTIVE,
        secretHash: await hashSecret(password),
      },
    });
    return { account, identity };
  }

  it('rejects OIDC identity resolution when external subject is not explicitly linked', async () => {
    const claims = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'unlinked-subject',
      aud: TEST_OIDC_PROVIDER.audience,
    });

    await expect(oidcIdentityResolver.resolveIdentity(claims)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('locks out account after repeated failed password attempts', async () => {
    const { account } = await provisionPasswordUser('lockout@test.gov', 'CorrectPass123!');

    for (let i = 0; i < 5; i += 1) {
      await expect(
        sessions.authenticateWithPassword('lockout@test.gov', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    }

    const updated = await prisma.userAccount.findUnique({ where: { id: account.id } });
    expect(updated?.lockedUntil).not.toBeNull();

    await expect(
      sessions.authenticateWithPassword('lockout@test.gov', 'CorrectPass123!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('enforces active session limits per account', async () => {
    const { account, identity } = await provisionPasswordUser('sessions@test.gov', 'Pass123456!');

    for (let i = 0; i < 11; i += 1) {
      await sessions.createSession({
        identityId: identity.id,
        userAccountId: account.id,
      });
    }

    const active = await prisma.session.count({
      where: { userAccountId: account.id, status: SessionStatus.ACTIVE },
    });

    expect(active).toBeLessThanOrEqual(10);
  });

  it('rejects suspended account at OIDC resolution boundary', async () => {
    const person = await prisma.person.create({
      data: { givenName: 'Susp', familyName: 'User' },
    });
    const account = await prisma.userAccount.create({
      data: {
        loginIdentifier: 'suspended@test.gov',
        personId: person.id,
        status: AccountStatus.SUSPENDED,
      },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'suspended@test.gov',
        userAccountId: account.id,
        personId: person.id,
      },
    });
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: TEST_OIDC_PROVIDER.code,
        oidcSubject: 'linked-subject',
      },
    });

    const claims = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'linked-subject',
      aud: TEST_OIDC_PROVIDER.audience,
      amr: ['mfa'],
    });

    await expect(oidcIdentityResolver.resolveIdentity(claims)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('records MFA assurance on OIDC-backed sessions', async () => {
    const person = await prisma.person.create({
      data: { givenName: 'Mfa', familyName: 'User' },
    });
    const account = await prisma.userAccount.create({
      data: {
        loginIdentifier: 'mfa@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'mfa@test.gov',
        userAccountId: account.id,
        personId: person.id,
      },
    });
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: TEST_OIDC_PROVIDER.code,
        oidcSubject: 'mfa-subject',
      },
    });

    const claims = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'mfa-subject',
      aud: TEST_OIDC_PROVIDER.audience,
      amr: ['pwd', 'mfa'],
    });

    const resolved = await oidcIdentityResolver.resolveIdentity(claims);
    const { session } = await sessions.authenticateWithOidc(claims, resolved);

    expect(session.mfaSatisfied).toBe(true);
    expect(session.assuranceLevel).toBe(AssuranceLevel.HIGH);
    expect(session.authMethod).toBe(AuthenticationMethodType.OIDC);
  });
});
