import { type INestApplication } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asProtectedProfileBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 3C must-fail: authentication does not confer government authority', () => {
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

  it('does not create Officeholder, Appointment, Delegation, or decision authority on authentication', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Citizen', familyName: 'User' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'citizen.user@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: 'INDIVIDUAL',
        displayName: 'Citizen User',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: identity.id, type: 'PASSWORD', password: 'CitizenPass123!' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'citizen.user@test.gov', password: 'CitizenPass123!' })
      .expect(201);
    const login = asLoginResponseBody(loginRes.body);

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(200);
    const profile = asProtectedProfileBody(profileRes.body);

    expect(profile.hasGovernmentAuthority).toBe(false);
    expect(profile).not.toHaveProperty('canApproveLicense');
    expect(profile).not.toHaveProperty('canIssuePermit');
    expect(profile).not.toHaveProperty('isDecisionMaker');

    const [officeholderCount, appointmentCount, delegationCount] = await Promise.all([
      prisma.officeholder.count(),
      prisma.appointment.count(),
      prisma.delegation.count(),
    ]);

    expect(officeholderCount).toBe(0);
    expect(appointmentCount).toBe(0);
    expect(delegationCount).toBe(0);
  });
});
