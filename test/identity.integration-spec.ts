import { type INestApplication } from '@nestjs/common';
import { AccountStatus, AuthenticationMethodType, IdentityType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  asIdentityBody,
  asLoginResponseBody,
  asOrganizationBody,
  asPersonBody,
  asProtectedProfileBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 3 Identity & Access (integration)', () => {
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

  it('completes the identity lifecycle: person → account → identity → credential → auth → protected', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Jane', familyName: 'Citizen' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'jane.citizen@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'Jane Citizen',
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
        password: 'SecurePass123!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({
        identityId: identity.id,
        type: AuthenticationMethodType.PASSWORD,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({
        loginIdentifier: 'jane.citizen@test.gov',
        password: 'SecurePass123!',
      })
      .expect(201);
    const login = asLoginResponseBody(loginRes.body);

    expect(login.sessionToken).toBeDefined();
    expect(login.identityId).toBe(identity.id);

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(200);
    const profile = asProtectedProfileBody(profileRes.body);

    expect(profile.hasGovernmentAuthority).toBe(false);

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/logout')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(401);
  });

  it('creates organization, membership, and representative authority', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'TEST-ORG', name: 'Test Organization' })
      .expect(201);
    const org = asOrganizationBody(orgRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Test Organization Identity',
        organizationId: org.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/memberships')
      .send({
        organizationId: org.id,
        identityId: identity.id,
        roleLabel: 'admin',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/representative-authorities')
      .send({
        organizationId: org.id,
        identityId: identity.id,
        scopeDescription: 'Submit applications on behalf of org',
        effectiveFrom: new Date().toISOString(),
      })
      .expect(201);
  });
});
