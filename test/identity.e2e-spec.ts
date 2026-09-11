import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  AuthenticationMethodType,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  MembershipStatus,
  RepresentativeAuthorityStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { AuthorityBoundaryService } from '../src/identity/common/authority-boundary.service';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asProtectedProfileBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 3F Identity & Access E2E acceptance', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('demonstrates full Phase 3 acceptance flow with audit events', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Alice', familyName: 'Official' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'alice.official@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'Alice Official',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: 'PASSWORD',
        password: 'AlicePass123!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({
        identityId: identity.id,
        type: AuthenticationMethodType.PASSWORD,
      })
      .expect(201);

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'GOV-DEPT', name: 'Government Department' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/memberships')
      .send({
        organizationId: (orgRes.body as { id: string }).id,
        identityId: identity.id,
        roleLabel: 'representative',
        status: MembershipStatus.ACTIVE,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/representative-authorities')
      .send({
        organizationId: (orgRes.body as { id: string }).id,
        identityId: identity.id,
        scopeDescription: 'Represent org in filings',
        effectiveFrom: new Date().toISOString(),
        status: RepresentativeAuthorityStatus.ACTIVE,
      })
      .expect(201);

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'TEST-JUR',
        name: 'Test Jurisdiction',
        type: 'NATIONAL',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'TEST-INST',
        name: 'Test Institution',
        type: 'GOVERNMENT',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    const department = await prisma.department.create({
      data: {
        institutionId: institution.id,
        code: 'TEST-DEPT',
        name: 'Test Department',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    const office = await prisma.office.create({
      data: {
        departmentId: department.id,
        code: 'TEST-OFFICE',
        name: 'Test Office',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    const officeholder = await prisma.officeholder.create({
      data: {
        code: 'OH-ALICE',
        name: 'Alice Official (Institutional)',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/officeholder-links')
      .send({
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({
        loginIdentifier: 'alice.official@test.gov',
        password: 'AlicePass123!',
      })
      .expect(201);
    const login = asLoginResponseBody(loginRes.body);

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(200);
    const profile = asProtectedProfileBody(profileRes.body);

    expect(profile.hasGovernmentAuthority).toBe(false);

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: { identityId: identity.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(auditEvents.some((e) => e.eventType === 'AUTHENTICATION_SUCCESS')).toBe(true);
    expect(auditEvents.some((e) => e.eventType === 'SESSION_CREATED')).toBe(true);
    expect(auditEvents.some((e) => e.eventType === 'PROTECTED_ENDPOINT_ACCESS')).toBe(true);
    expect(auditEvents.some((e) => e.eventType === 'OFFICEHOLDER_LINK_CREATED')).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/logout')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(401);
  });
});

describe('Phase 3 must-fail authority acceptance scenarios', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authorityBoundary: AuthorityBoundaryService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    authorityBoundary = app.get(AuthorityBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects government authority for authenticated user with no Officeholder link', () => {
    const resolution = authorityBoundary.resolveGovernmentAuthority({
      identityId: 'test-identity-id',
    });
    expect(resolution).toBeNull();
  });

  it('rejects government authority for user with Officeholder link but no Appointment', async () => {
    const officeholder = await prisma.officeholder.create({
      data: { code: 'OH-NOAPPT', name: 'No Appointment', status: StructuralLifecycleStatus.ACTIVE },
    });
    const identity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'No Appt' },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: identity.id,
        officeholderId: officeholder.id,
      }),
    ).toBeNull();
  });

  it('rejects government authority when external token claims admin', () => {
    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: 'test-id',
        externalClaims: { admin: true, role: 'superadmin' },
      }),
    ).toBeNull();
  });

  it('rejects government authority after MFA verification', () => {
    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: 'test-id',
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();
  });

  it('rejects government authority for active organization representative', async () => {
    const org = await prisma.organization.create({
      data: { code: 'REP-ORG', name: 'Rep Org' },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.ORGANIZATION,
        displayName: 'Rep Identity',
        organizationId: org.id,
      },
    });
    const repAuth = await prisma.representativeAuthority.create({
      data: {
        organizationId: org.id,
        identityId: identity.id,
        scopeDescription: 'Full representation',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date(),
      },
    });

    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: identity.id,
        organizationId: org.id,
        representativeAuthorityId: repAuth.id,
      }),
    ).toBeNull();
  });

  it('rejects government authority for authenticated service identity', async () => {
    const identity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Batch Service' },
    });

    expect(authorityBoundary.resolveGovernmentAuthority({ identityId: identity.id })).toBeNull();
  });

  it('rejects suspended account authentication', async () => {
    const person = await prisma.person.create({
      data: { givenName: 'Suspended', familyName: 'User' },
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
        displayName: 'Suspended',
        userAccountId: account.id,
        personId: person.id,
      },
    });
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: 'PASSWORD',
        status: 'ACTIVE',
        secretHash: 'dummy',
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'suspended@test.gov', password: 'any' })
      .expect(401);
  });
});
