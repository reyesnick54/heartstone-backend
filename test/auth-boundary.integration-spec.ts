import { type INestApplication } from '@nestjs/common';
import { AccountStatus, CredentialStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 3C authentication boundary (integration)', () => {
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

  async function provisionActiveAccount(loginIdentifier: string, password: string) {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Test', familyName: 'User' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier,
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: 'INDIVIDUAL',
        displayName: 'Test User',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: identity.id, type: 'PASSWORD', password })
      .expect(201);

    return { account, identity };
  }

  it('rejects revoked credentials at login', async () => {
    const { identity } = await provisionActiveAccount('revoked@test.gov', 'RevokedPass123!');

    await prisma.credential.updateMany({
      where: { identityId: identity.id },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'revoked@test.gov', password: 'RevokedPass123!' })
      .expect(401);

    const events = await prisma.securityAuditEvent.findMany({
      where: { eventType: 'CREDENTIAL_REJECTED' },
    });
    expect(events.length).toBeGreaterThan(0);
  });

  it('revokes all account sessions immediately', async () => {
    await provisionActiveAccount('multi@test.gov', 'MultiPass123!');

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'multi@test.gov', password: 'MultiPass123!' })
      .expect(201);

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'multi@test.gov', password: 'MultiPass123!' })
      .expect(201);

    const account = await prisma.userAccount.findUnique({
      where: { loginIdentifier: 'multi@test.gov' },
    });
    if (!account) {
      throw new Error('Expected account to exist');
    }

    await prisma.session.updateMany({
      where: { userAccountId: account.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: 'ACCOUNT_REVOCATION' },
    });

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${asLoginResponseBody(loginA.body).sessionToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${asLoginResponseBody(loginB.body).sessionToken}`)
      .expect(401);
  });

  it('stores only token hashes and records session expiry events', async () => {
    await provisionActiveAccount('expire@test.gov', 'ExpirePass123!');

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: 'expire@test.gov', password: 'ExpirePass123!' })
      .expect(201);
    const login = asLoginResponseBody(loginRes.body);

    const stored = await prisma.session.findUnique({
      where: { tokenHash: hashToken(login.sessionToken) },
    });
    if (!stored) {
      throw new Error('Expected session to be persisted');
    }
    expect(stored.tokenHash).not.toBe(login.sessionToken);

    await prisma.session.update({
      where: { id: stored.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(401);

    const events = await prisma.securityAuditEvent.findMany({
      where: { eventType: 'SESSION_EXPIRED' },
    });
    expect(events.length).toBeGreaterThan(0);
  });
});
