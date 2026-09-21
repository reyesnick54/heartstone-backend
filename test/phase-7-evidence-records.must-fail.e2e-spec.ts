import { type INestApplication } from '@nestjs/common';
import { IdentityType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { FORBIDDEN_CLIENT_EVIDENCE_FIELDS } from '../src/evidence/evidence.constants';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './helpers/identity-provisioning.fixture';
import { createPhase7IntegrationApp, resetAllTestData } from './helpers/phase-7-integration-app';
import { seedPhase7Fixture } from './helpers/phase-7-test-fixtures';

describe('Phase 7H must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createPhase7IntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects applicant access to unrelated master file', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const otherPerson = await prisma.person.create({
      data: { givenName: 'Other', familyName: 'Applicant' },
    });
    const otherAccount = await prisma.userAccount.create({
      data: { loginIdentifier: 'p7h-other@test.gov', personId: otherPerson.id, status: 'ACTIVE' },
    });
    const otherIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Other Applicant',
        userAccountId: otherAccount.id,
        personId: otherPerson.id,
      },
    });

    await createPasswordCredentialViaPrisma(prisma, otherIdentity.id, 'Other123!');
    await createPasswordAuthenticationMethodViaPrisma(prisma, otherIdentity.id);

    const otherSessionToken = await loginAndGetSessionToken(app, 'p7h-other@test.gov', 'Other123!');

    await request(app.getHttpServer())
      .get(`/api/v1/records/master-files/${fixture.masterFileId}`)
      .set('Authorization', `Bearer ${otherSessionToken}`)
      .expect(403);
  });

  it('documents forbidden client evidence fields at API boundary', () => {
    expect(FORBIDDEN_CLIENT_EVIDENCE_FIELDS).toContain('verified');
    expect(FORBIDDEN_CLIENT_EVIDENCE_FIELDS).toContain('isVerified');
    expect(FORBIDDEN_CLIENT_EVIDENCE_FIELDS).toContain('accepted');
  });
});
