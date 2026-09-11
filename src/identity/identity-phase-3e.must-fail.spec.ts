import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  AssuranceLevel,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  MembershipStatus,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
  SessionStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { AuthorityBoundaryService } from './common/authority-boundary.service';
import { hashToken, verifySecret } from './common/crypto.util';
import { CredentialsService } from './credentials/credentials.service';
import { IdentityModule } from './identity.module';
import { OfficeholderLinksService } from './officeholder-links/officeholder-links.service';
import { OidcAuthService } from './oidc/oidc-auth.service';
import { SessionsService } from './sessions/sessions.service';
import { UserAccountsService } from './user-accounts/user-accounts.service';

describe('Phase 3 architectural must-fail invariants', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let userAccounts: UserAccountsService;
  let credentials: CredentialsService;
  let sessions: SessionsService;
  let officeholderLinks: OfficeholderLinksService;
  let oidcAuth: OidcAuthService;
  let authorityBoundary: AuthorityBoundaryService;
  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        IdentityModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    userAccounts = moduleRef.get(UserAccountsService);
    credentials = moduleRef.get(CredentialsService);
    sessions = moduleRef.get(SessionsService);
    officeholderLinks = moduleRef.get(OfficeholderLinksService);
    oidcAuth = moduleRef.get(OidcAuthService);
    authorityBoundary = moduleRef.get(AuthorityBoundaryService);
  });

  beforeEach(async () => {
    await prisma.securityAuditEvent.deleteMany();
    await prisma.session.deleteMany();
    await prisma.identityOfficeholderLink.deleteMany();
    await prisma.representativeAuthority.deleteMany();
    await prisma.organizationMembership.deleteMany();
    await prisma.authenticationMethod.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.userAccount.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.person.deleteMany();
    await prisma.delegation.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.officeholder.deleteMany();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createOfficeholder(code = 'OH-001'): Promise<string> {
    const officeholder = await prisma.officeholder.create({
      data: { code, name: 'Test Officeholder' },
    });
    return officeholder.id;
  }

  async function provisionUser(loginIdentifier: string, password: string) {
    const person = await prisma.person.create({
      data: { givenName: 'Test', familyName: 'User' },
    });

    const account = await userAccounts.create({
      loginIdentifier,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    });

    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: loginIdentifier,
        userAccountId: account.id,
        personId: person.id,
      },
    });

    await credentials.create({
      identityId: identity.id,
      type: CredentialType.PASSWORD,
      password,
      status: CredentialStatus.ACTIVE,
    });

    const login = await sessions.authenticateWithPassword(loginIdentifier, password);
    return { person, account, identity, login };
  }

  it('1. UserAccount creation does not create Officeholder', async () => {
    const before = await prisma.officeholder.count();
    await userAccounts.create({
      loginIdentifier: 'alice@test.gov',
      status: AccountStatus.PENDING,
    });
    expect(await prisma.officeholder.count()).toBe(before);
  });

  it('2. Authentication does not create Officeholder', async () => {
    const before = await prisma.officeholder.count();
    await provisionUser('bob@test.gov', 'password123');
    expect(await prisma.officeholder.count()).toBe(before);
  });

  it('3. OIDC role claims do not create Officeholder', async () => {
    const officeholderId = await createOfficeholder('OH-OIDC');

    const result = await oidcAuth.linkOrCreateUserFromOidcClaims({
      providerKey: 'test-oidc',
      subject: 'sub-123',
      loginIdentifier: 'oidc-user@test.gov',
      displayName: 'OIDC User',
      roles: ['officeholder', 'minister', 'admin'],
    });

    const links = await prisma.identityOfficeholderLink.findMany({
      where: { officeholderId, identityId: result.identityId },
    });

    expect(links).toHaveLength(0);
    expect(await prisma.officeholder.count()).toBe(1);
  });

  it('4. MFA success does not create governmental authority', async () => {
    const { identity, account } = await provisionUser('mfa-user@test.gov', 'password123');

    await prisma.authenticationMethod.create({
      data: {
        identityId: identity.id,
        type: AuthenticationMethodType.MFA_TOTP,
        assuranceLevel: AssuranceLevel.HIGH,
      },
    });

    const resolution = authorityBoundary.resolveGovernmentAuthority({
      identityId: identity.id,
      userAccountId: account.id,
      assuranceLevel: AssuranceLevel.HIGH,
    });

    expect(resolution).toBeNull();
  });

  it('5. Service identity authentication does not create Officeholder', async () => {
    const officeholderId = await createOfficeholder('OH-SVC');
    const serviceIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: 'Reporting Service',
      },
    });

    await credentials.create({
      identityId: serviceIdentity.id,
      type: CredentialType.API_KEY,
      status: CredentialStatus.ACTIVE,
    });

    const { session } = await sessions.createSession({
      identityId: serviceIdentity.id,
      assuranceLevel: AssuranceLevel.LOW,
    });

    expect(session.identityId).toBe(serviceIdentity.id);

    const links = await prisma.identityOfficeholderLink.findMany({ where: { officeholderId } });
    expect(links).toHaveLength(0);
  });

  it('6. IdentityOfficeholderLink does not create Appointment', async () => {
    const officeholderId = await createOfficeholder('OH-LINK-1');
    const { identity } = await provisionUser('carol@test.gov', 'password123');

    await officeholderLinks.create({
      identityId: identity.id,
      officeholderId,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    });

    expect(
      await prisma.appointment.count({
        where: { officeholderId },
      }),
    ).toBe(0);
  });

  it('7. IdentityOfficeholderLink does not create Delegation', async () => {
    const officeholderId = await createOfficeholder('OH-LINK-2');
    const { identity } = await provisionUser('dave@test.gov', 'password123');

    await officeholderLinks.create({
      identityId: identity.id,
      officeholderId,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    });

    expect(await prisma.delegation.count()).toBe(0);
  });

  it('8. OrganizationMembership does not create Appointment', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'ORG-1',
        name: 'Test Org',
        status: OrganizationStatus.ACTIVE,
      },
    });
    const { identity } = await provisionUser('member@test.gov', 'password123');

    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        identityId: identity.id,
        status: MembershipStatus.ACTIVE,
      },
    });

    expect(await prisma.appointment.count()).toBe(0);
  });

  it('9. RepresentativeAuthority does not create governmental Delegation', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'ORG-2',
        name: 'Partner Org',
        status: OrganizationStatus.ACTIVE,
      },
    });
    const { identity } = await provisionUser('rep@test.gov', 'password123');

    await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: identity.id,
        scopeDescription: 'Submit applications',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date(),
      },
    });

    expect(await prisma.delegation.count()).toBe(0);
  });

  it('10. Technical permissions do not establish legal authority', async () => {
    const { identity, account } = await provisionUser('tech@test.gov', 'password123');

    const resolution = authorityBoundary.resolveGovernmentAuthority({
      identityId: identity.id,
      userAccountId: account.id,
      externalClaims: { admin: true, officer: true },
    });

    expect(resolution).toBeNull();
  });

  it('11. Suspended/revoked accounts cannot authenticate', async () => {
    const { account } = await provisionUser('suspended@test.gov', 'password123');

    await prisma.userAccount.update({
      where: { id: account.id },
      data: { status: AccountStatus.SUSPENDED },
    });

    await expect(
      sessions.authenticateWithPassword('suspended@test.gov', 'password123'),
    ).rejects.toThrow(UnauthorizedException);

    await prisma.userAccount.update({
      where: { id: account.id },
      data: { status: AccountStatus.REVOKED },
    });

    await expect(
      sessions.authenticateWithPassword('suspended@test.gov', 'password123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('12. Expired/revoked sessions are rejected', async () => {
    const { login } = await provisionUser('session@test.gov', 'password123');

    await prisma.session.update({
      where: { id: login.session.id },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await expect(sessions.validateSessionToken(login.sessionToken)).rejects.toThrow(
      UnauthorizedException,
    );

    const { login: expiredLogin } = await provisionUser('expired@test.gov', 'password123');
    await prisma.session.update({
      where: { id: expiredLogin.session.id },
      data: {
        status: SessionStatus.EXPIRED,
        expiresAt: new Date('2020-01-01'),
      },
    });

    await expect(sessions.validateSessionToken(expiredLogin.sessionToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('13. Revoked credentials are rejected', async () => {
    const { identity } = await provisionUser('cred@test.gov', 'password123');

    await prisma.credential.updateMany({
      where: { identityId: identity.id },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await expect(sessions.authenticateWithPassword('cred@test.gov', 'password123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('14. Inactive/revoked Officeholder linkage is not treated as current', async () => {
    const officeholderId = await createOfficeholder('OH-LINK-3');
    const { identity } = await provisionUser('link@test.gov', 'password123');

    const pendingLink = await officeholderLinks.create({
      identityId: identity.id,
      officeholderId,
      status: IdentityOfficeholderLinkStatus.PENDING,
    });

    const activeLinks = await prisma.identityOfficeholderLink.findMany({
      where: {
        identityId: identity.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    expect(activeLinks).toHaveLength(0);

    await prisma.identityOfficeholderLink.update({
      where: { id: pendingLink.id },
      data: { status: IdentityOfficeholderLinkStatus.ACTIVE },
    });

    await prisma.identityOfficeholderLink.update({
      where: { id: pendingLink.id },
      data: { status: IdentityOfficeholderLinkStatus.REVOKED, revokedAt: new Date() },
    });

    const currentLinks = await prisma.identityOfficeholderLink.findMany({
      where: {
        identityId: identity.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    expect(currentLinks).toHaveLength(0);
  });

  it('15. Security audit history remains after lifecycle changes', async () => {
    const officeholderId = await createOfficeholder('OH-AUDIT');
    const { identity } = await provisionUser('audit@test.gov', 'password123');

    const link = await officeholderLinks.create({
      identityId: identity.id,
      officeholderId,
      status: IdentityOfficeholderLinkStatus.PENDING,
    });

    await prisma.identityOfficeholderLink.update({
      where: { id: link.id },
      data: { status: IdentityOfficeholderLinkStatus.ACTIVE },
    });

    await prisma.identityOfficeholderLink.update({
      where: { id: link.id },
      data: { status: IdentityOfficeholderLinkStatus.REVOKED, revokedAt: new Date() },
    });

    const events = await prisma.securityAuditEvent.findMany({
      where: {
        OR: [{ identityId: identity.id }, { metadata: { path: ['linkId'], equals: link.id } }],
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((event) => event.eventType === 'OFFICEHOLDER_LINK_CREATED')).toBe(true);
    expect(events.some((event) => event.eventType === 'AUTHENTICATION_SUCCESS')).toBe(true);
  });

  it('records OIDC claims without creating officeholder linkage metadata', async () => {
    await oidcAuth.linkOrCreateUserFromOidcClaims({
      providerKey: 'azure-ad',
      subject: 'azure-subject-1',
      loginIdentifier: 'azure-user@test.gov',
      roles: ['admin', 'officer'],
    });

    const events = await prisma.securityAuditEvent.findMany({
      where: { eventType: 'OIDC_CLAIM_RECEIVED' },
    });

    expect(events[0]?.metadata).toMatchObject({
      officeholderLinkageCreated: false,
      officeholderLinkageActivated: false,
    });
  });

  it('stores only hashed session tokens', async () => {
    const { login } = await provisionUser('token@test.gov', 'password123');
    const stored = await prisma.session.findUnique({ where: { id: login.session.id } });

    expect(stored?.tokenHash).toBe(hashToken(login.sessionToken));
    expect(stored?.tokenHash).not.toBe(login.sessionToken);
  });

  it('stores only hashed password credentials', async () => {
    const { identity } = await provisionUser('hash@test.gov', 'PlainPassword123!');
    const credential = await prisma.credential.findFirst({ where: { identityId: identity.id } });

    expect(credential?.secretHash).toBeTruthy();
    expect(credential?.secretHash).not.toBe('PlainPassword123!');
    expect(credential?.secretHash).toBeTruthy();
    const matches = await verifySecret('PlainPassword123!', credential?.secretHash ?? '');
    expect(matches).toBe(true);
  });
});
