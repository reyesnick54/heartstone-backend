import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  AssuranceLevel,
  DelegationStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  SessionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { ActorContextService } from '../src/identity/auth/context/actor-context.service';
import { FORBIDDEN_ACTOR_CONTEXT_AUTHORITY_FIELDS } from '../src/identity/auth/context/actor-context.types';
import { hashToken } from '../src/identity/common/crypto.util';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asProtectedProfileBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Actor context must-fail invariants (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let actorContextService: ActorContextService;

  const at = new Date('2026-06-01T12:00:00.000Z');

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    actorContextService = app.get(ActorContextService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function provisionAccount(loginIdentifier: string, password: string) {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Actor', familyName: 'Test' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({ loginIdentifier, personId: person.id, status: AccountStatus.ACTIVE })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: 'INDIVIDUAL',
        displayName: 'Actor Test',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: identity.id, type: 'PASSWORD', password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier, password })
      .expect(201);

    return {
      person,
      account,
      identity,
      sessionToken: asLoginResponseBody(loginRes.body).sessionToken,
    };
  }

  async function seedGovernmentFixture(identityId: string) {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'AC-JUR', name: 'Actor Context Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'AC-INST',
        name: 'Actor Context Institution',
        type: 'AGENCY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'AC-DEPT', name: 'Dept' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'AC-OFF', name: 'Office' },
    });
    const officeholder = await prisma.officeholder.create({
      data: { code: 'AC-OH', name: 'Officeholder' },
    });

    return { institution, department, office, officeholder, identityId };
  }

  it('client cannot impersonate another identity by passing identityId', async () => {
    const actorA = await provisionAccount('actor.a@test.gov', 'ActorPass123!');
    await provisionAccount('actor.b@test.gov', 'ActorPass123!');

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/logout')
      .set('Authorization', `Bearer ${actorA.sessionToken}`)
      .send({ identityId: '00000000-0000-4000-8000-000000000099' })
      .expect(403);
  });

  it('login does not create authority', async () => {
    const { sessionToken } = await provisionAccount('noauth@test.gov', 'ActorPass123!');

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    const profile = asProtectedProfileBody(profileRes.body);
    expect(profile.hasGovernmentAuthority).toBe(false);
  });

  it('MFA assurance level does not create authority', async () => {
    const { identity, sessionToken } = await provisionAccount('mfa@test.gov', 'ActorPass123!');

    await prisma.session.updateMany({
      where: { identityId: identity.id },
      data: { assuranceLevel: AssuranceLevel.HIGH },
    });

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    expect(asProtectedProfileBody(profileRes.body).hasGovernmentAuthority).toBe(false);
  });

  it('OIDC role claim metadata does not create government authority in actor context', async () => {
    const { identity, sessionToken } = await provisionAccount('oidc@test.gov', 'ActorPass123!');

    await prisma.authenticationMethod.create({
      data: {
        identityId: identity.id,
        type: 'OIDC',
        isEnabled: true,
        assuranceLevel: AssuranceLevel.MEDIUM,
        oidcIssuer: 'https://issuer.test',
        oidcClientId: 'client',
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (
          await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } })
        ).id,
        identityId: identity.id,
        assuranceLevel: AssuranceLevel.MEDIUM,
      },
      at,
    });

    for (const field of FORBIDDEN_ACTOR_CONTEXT_AUTHORITY_FIELDS) {
      expect(actor).not.toHaveProperty(field);
    }

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    expect(asProtectedProfileBody(profileRes.body).hasGovernmentAuthority).toBe(false);
  });

  it('revoked officeholder link is excluded from actor context', async () => {
    const { identity, sessionToken } = await provisionAccount('revlink@test.gov', 'ActorPass123!');
    const fixture = await seedGovernmentFixture(identity.id);

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: fixture.officeholder.id,
        status: IdentityOfficeholderLinkStatus.REVOKED,
        revokedAt: new Date('2026-01-01'),
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (
          await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } })
        ).id,
        identityId: identity.id,
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.officeholderLinks).toHaveLength(0);
    expect(actor.hasInstitutionalRelationships).toBe(false);

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    expect(asProtectedProfileBody(profileRes.body).hasInstitutionalRelationships).toBe(false);
  });

  it('expired appointment is excluded from actor context', async () => {
    const { identity } = await provisionAccount('expappt@test.gov', 'ActorPass123!');
    const fixture = await seedGovernmentFixture(identity.id);

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: fixture.officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    await prisma.appointment.create({
      data: {
        officeId: fixture.office.id,
        officeholderId: fixture.officeholder.id,
        status: AppointmentStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (
          await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } })
        ).id,
        identityId: identity.id,
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.activeAppointments).toHaveLength(0);
  });

  it('expired delegation is excluded from actor context', async () => {
    const { identity } = await provisionAccount('expdeleg@test.gov', 'ActorPass123!');
    const fixture = await seedGovernmentFixture(identity.id);

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: fixture.officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    await prisma.appointment.create({
      data: {
        officeId: fixture.office.id,
        officeholderId: fixture.officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });
    await prisma.delegation.create({
      data: {
        institutionId: fixture.institution.id,
        recipientOfficeholderId: fixture.officeholder.id,
        status: DelegationStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
        scopeDescription: 'Expired delegation',
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (
          await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } })
        ).id,
        identityId: identity.id,
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.activeDelegations).toHaveLength(0);
  });

  it('service identity cannot become a human officeholder in actor context', async () => {
    const serviceIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: 'Batch Service',
      },
    });
    const fixture = await seedGovernmentFixture(serviceIdentity.id);

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: serviceIdentity.id,
        officeholderId: fixture.officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    const token = 'service-session-token';
    await prisma.session.create({
      data: {
        identityId: serviceIdentity.id,
        tokenHash: hashToken(token),
        status: SessionStatus.ACTIVE,
        assuranceLevel: AssuranceLevel.LOW,
        issuedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (await prisma.session.findFirstOrThrow({ where: { identityId: serviceIdentity.id } }))
          .id,
        identityId: serviceIdentity.id,
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.identityType).toBe(IdentityType.SERVICE);
    expect(actor.officeholderLinks).toHaveLength(0);
    expect(actor.activeAppointments).toHaveLength(0);
  });

  it('authenticated identity without officeholder linkage gets no institutional actor context', async () => {
    const { identity, sessionToken } = await provisionAccount('nolink@test.gov', 'ActorPass123!');

    const actor = await actorContextService.resolveFromSessionContext({
      session: {
        sessionId: (
          await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } })
        ).id,
        identityId: identity.id,
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.hasInstitutionalRelationships).toBe(false);
    expect(actor.institutionContexts).toEqual([]);

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    expect(asProtectedProfileBody(profileRes.body).hasInstitutionalRelationships).toBe(false);
  });

  it('actor context cannot be constructed from request-body identifiers alone', async () => {
    await expect(
      actorContextService.resolveFromSessionContext({
        session: {
          sessionId: '',
          identityId: '00000000-0000-4000-8000-000000000099',
          assuranceLevel: AssuranceLevel.LOW,
        },
      }),
    ).rejects.toThrow('Actor context requires server-derived session identity');

    expect(() => {
      actorContextService.assertServerDerivedSession(null);
    }).toThrow('Actor context requires authenticated server-derived session context');
  });

  it('rejects revoked sessions when resolving actor context directly', async () => {
    const { identity } = await provisionAccount('revsession@test.gov', 'ActorPass123!');
    const session = await prisma.session.findFirstOrThrow({ where: { identityId: identity.id } });

    await prisma.session.update({
      where: { id: session.id },
      data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
    });

    await expect(
      actorContextService.resolveFromSessionContext({
        session: {
          sessionId: session.id,
          identityId: identity.id,
          assuranceLevel: AssuranceLevel.LOW,
        },
      }),
    ).rejects.toThrow('Session has been revoked');
  });
});
