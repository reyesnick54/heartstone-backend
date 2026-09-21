import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  createPasswordAuthenticationMethodViaPrisma,
  loginAndGetSessionToken,
  provisionIdentityViaPrisma,
} from './helpers/identity-provisioning.fixture';
import { asProtectedProfileBody } from './helpers/identity-test-types';
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
    const provisioned = await provisionIdentityViaPrisma(prisma, {
      loginIdentifier: 'citizen.user@test.gov',
      password: 'CitizenPass123!',
      givenName: 'Citizen',
      familyName: 'User',
      displayName: 'Citizen User',
    });
    await createPasswordAuthenticationMethodViaPrisma(prisma, provisioned.identityId);

    const sessionToken = await loginAndGetSessionToken(
      app,
      'citizen.user@test.gov',
      'CitizenPass123!',
    );

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${sessionToken}`)
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
