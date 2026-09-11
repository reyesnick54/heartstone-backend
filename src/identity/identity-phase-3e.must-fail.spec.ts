import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  CredentialType,
  IdentityOfficeholderLinkStatus,
  IdentityOfficeholderVerificationMethod,
  PrincipalKind,
  SecurityAuditEventType,
  UserAccountKind,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { UserAccountsService } from './accounts/user-accounts.service';
import { SecurityAuditService } from './audit/security-audit.service';
import { AuthService } from './auth/auth.service';
import { isIdentityOfficeholderLinkActive } from './common/is-active-link.util';
import { CredentialsService } from './credentials/credentials.service';
import { IdentityModule } from './identity.module';
import { IdentityOfficeholderLinksService } from './officeholder-links/identity-officeholder-links.service';
import { OidcAuthService } from './oidc/oidc-auth.service';
import { ServiceIdentitiesService } from './service-identities/service-identities.service';

describe('Phase 3E must-fail invariants', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let userAccounts: UserAccountsService;
  let authService: AuthService;
  let credentials: CredentialsService;
  let linksService: IdentityOfficeholderLinksService;
  let oidcAuth: OidcAuthService;
  let serviceIdentities: ServiceIdentitiesService;
  let audit: SecurityAuditService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    userAccounts = moduleRef.get(UserAccountsService);
    authService = moduleRef.get(AuthService);
    credentials = moduleRef.get(CredentialsService);
    linksService = moduleRef.get(IdentityOfficeholderLinksService);
    oidcAuth = moduleRef.get(OidcAuthService);
    serviceIdentities = moduleRef.get(ServiceIdentitiesService);
    audit = moduleRef.get(SecurityAuditService);
  });

  beforeEach(async () => {
    await prisma.securityAuditEvent.deleteMany();
    await prisma.identityOfficeholderLink.deleteMany();
    await prisma.externalIdentityLink.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.userAccount.deleteMany();
    await prisma.serviceIdentity.deleteMany();
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
      data: {
        code,
        name: 'Test Officeholder',
      },
    });

    return officeholder.id;
  }

  async function createStandardUser(username: string, password: string) {
    const account = await userAccounts.create({
      username,
      displayName: username,
      actor: { kind: PrincipalKind.SYSTEM },
    });

    await credentials.create({
      userAccountId: account.id,
      type: CredentialType.PASSWORD,
      identifier: username,
      secret: password,
      actor: { kind: PrincipalKind.SYSTEM },
    });

    const login = await authService.loginUser({ username, password });
    return { account, login };
  }

  async function createAdminUser(username: string, password: string) {
    const account = await userAccounts.create({
      username,
      displayName: username,
      kind: UserAccountKind.IDENTITY_ADMINISTRATOR,
      actor: { kind: PrincipalKind.SYSTEM },
    });

    await credentials.create({
      userAccountId: account.id,
      type: CredentialType.PASSWORD,
      identifier: username,
      secret: password,
      actor: { kind: PrincipalKind.SYSTEM },
    });

    const login = await authService.loginUser({ username, password });
    return { account, login };
  }

  it('1. creating a UserAccount does not create Officeholder', async () => {
    const before = await prisma.officeholder.count();
    await userAccounts.create({
      username: 'alice',
      actor: { kind: PrincipalKind.SYSTEM },
    });
    const after = await prisma.officeholder.count();
    expect(after).toBe(before);
  });

  it('2. authenticating a UserAccount does not create Officeholder', async () => {
    const before = await prisma.officeholder.count();
    await createStandardUser('bob', 'password123');
    const after = await prisma.officeholder.count();
    expect(after).toBe(before);
  });

  it('3. linking Identity to Officeholder does not create Appointment', async () => {
    const officeholderId = await createOfficeholder();
    const { account, login } = await createStandardUser('carol', 'password123');
    const { login: adminLogin } = await createAdminUser('admin1', 'password123');

    const link = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    await linksService.activateLink({
      linkId: link.id,
      verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      actor: adminLogin.principal,
    });

    const appointmentCount = await prisma.appointment.count({
      where: { officeholderId },
    });

    expect(appointmentCount).toBe(0);
  });

  it('4. linking Identity to Officeholder does not create Delegation', async () => {
    const officeholderId = await createOfficeholder('OH-002');
    const { account, login } = await createStandardUser('dave', 'password123');
    const { login: adminLogin } = await createAdminUser('admin2', 'password123');

    const link = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    await linksService.activateLink({
      linkId: link.id,
      verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      actor: adminLogin.principal,
    });

    const delegationCount = await prisma.delegation.count();
    expect(delegationCount).toBe(0);
  });

  it('5. linking Identity to Officeholder does not produce a governmental decision permission', async () => {
    const officeholderId = await createOfficeholder('OH-003');
    const { account, login } = await createStandardUser('erin', 'password123');
    const { login: adminLogin } = await createAdminUser('admin3', 'password123');

    const link = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    await linksService.activateLink({
      linkId: link.id,
      verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      actor: adminLogin.principal,
    });

    const principal = await authService.resolvePrincipalFromToken(login.token);

    expect(principal.verifiedOfficeholderId).toBe(officeholderId);
    expect(principal).not.toHaveProperty('canApprove');
    expect(principal).not.toHaveProperty('canIssue');
    expect(principal).not.toHaveProperty('decisionAuthority');
    expect(principal).not.toHaveProperty('legalAuthority');
  });

  it('6. inactive/suspended/revoked linkage cannot be treated as active', async () => {
    const officeholderId = await createOfficeholder('OH-004');
    const { account, login } = await createStandardUser('frank', 'password123');
    const { login: adminLogin } = await createAdminUser('admin4', 'password123');

    const pending = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    expect(isIdentityOfficeholderLinkActive(pending)).toBe(false);

    const verified = await linksService.activateLink({
      linkId: pending.id,
      verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      actor: adminLogin.principal,
    });

    expect(isIdentityOfficeholderLinkActive(verified)).toBe(true);

    const suspended = await linksService.suspendLink(verified.id, adminLogin.principal);
    expect(isIdentityOfficeholderLinkActive(suspended)).toBe(false);

    const revoked = await linksService.revokeLink(verified.id, adminLogin.principal);
    expect(isIdentityOfficeholderLinkActive(revoked)).toBe(false);

    const current = await linksService.findCurrentForPerson(account.personId);
    expect(current).toBeNull();
  });

  it('7. a normal user cannot self-activate an Officeholder linkage', async () => {
    const officeholderId = await createOfficeholder('OH-005');
    const { account, login } = await createStandardUser('grace', 'password123');

    const link = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    expect(() => {
      authService.assertIdentityAdministrator(login.principal);
    }).toThrow(ForbiddenException);

    await expect(
      linksService.activateLink({
        linkId: link.id,
        verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
        actor: login.principal,
      }),
    ).rejects.toThrow(ForbiddenException);

    const stored = await linksService.findById(link.id);
    expect(stored.status).toBe(IdentityOfficeholderLinkStatus.PENDING);
  });

  it('8. external OIDC role claims cannot create or activate Officeholder linkage automatically', async () => {
    const officeholderId = await createOfficeholder('OH-006');

    const result = await oidcAuth.linkOrCreateUserFromOidcClaims({
      providerKey: 'test-oidc',
      subject: 'sub-123',
      username: 'oidc-user',
      displayName: 'OIDC User',
      roles: ['officeholder', 'minister', 'admin'],
    });

    const links = await prisma.identityOfficeholderLink.findMany({
      where: {
        personId: result.personId,
        officeholderId,
      },
    });

    expect(links).toHaveLength(0);

    const identityLinkedEvents = await audit.listByEventType(
      SecurityAuditEventType.IDENTITY_LINKED,
    );
    expect(identityLinkedEvents[0]?.metadata).toMatchObject({
      officeholderLinkageCreated: false,
      officeholderLinkageActivated: false,
    });
  });

  it('9. a service identity cannot become an Officeholder through ordinary authentication', async () => {
    const officeholderId = await createOfficeholder('OH-007');
    const service = await serviceIdentities.create({
      code: 'svc-reporting',
      name: 'Reporting Service',
    });

    await credentials.create({
      serviceIdentityId: service.id,
      type: CredentialType.API_KEY,
      identifier: service.code,
      secret: 'service-secret-key',
      actor: { kind: PrincipalKind.SYSTEM },
    });

    const login = await authService.loginService({
      code: service.code,
      apiKey: 'service-secret-key',
    });

    expect(login.principal.kind).toBe(PrincipalKind.SERVICE_IDENTITY);
    expect(login.principal.verifiedOfficeholderId).toBeUndefined();
    expect(login.principal.personId).toBeUndefined();

    const links = await prisma.identityOfficeholderLink.findMany({
      where: { officeholderId },
    });
    expect(links).toHaveLength(0);
  });

  it('10. audit history remains after security lifecycle changes', async () => {
    const officeholderId = await createOfficeholder('OH-008');
    const { account, login } = await createStandardUser('henry', 'password123');
    const { login: adminLogin } = await createAdminUser('admin5', 'password123');

    const link = await linksService.requestLink({
      personId: account.personId,
      userAccountId: account.id,
      officeholderId,
      actor: login.principal,
    });

    await linksService.activateLink({
      linkId: link.id,
      verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      actor: adminLogin.principal,
    });

    await linksService.suspendLink(link.id, adminLogin.principal);
    await linksService.revokeLink(link.id, adminLogin.principal);

    const events = await audit.listBySubject('identity_officeholder_link', link.id);

    expect(events.map((event) => event.eventType)).toEqual([
      SecurityAuditEventType.OFFICEHOLDER_LINKAGE_REQUESTED,
      SecurityAuditEventType.OFFICEHOLDER_LINKAGE_ACTIVATED,
      SecurityAuditEventType.IDENTITY_VERIFICATION_CHANGED,
      SecurityAuditEventType.OFFICEHOLDER_LINKAGE_SUSPENDED,
      SecurityAuditEventType.OFFICEHOLDER_LINKAGE_REVOKED,
    ]);
  });
});
