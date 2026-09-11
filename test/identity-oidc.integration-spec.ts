import { type INestApplication } from '@nestjs/common';
import { CredentialType, IdentityType } from '@prisma/client';
import { createLocalJWKSet } from 'jose';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { InMemoryJwksResolverService } from '../src/identity/auth/oidc/jwks-resolver.service';
import { asLoginResponseBody } from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createOidcTestKeyMaterial,
  signOidcTestToken,
  TEST_OIDC_PROVIDER,
} from './helpers/oidc-test-fixtures';

describe('Phase 3D OIDC / service identity (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let keyMaterial: Awaited<ReturnType<typeof createOidcTestKeyMaterial>>;

  beforeAll(async () => {
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_PROVIDERS_JSON = JSON.stringify([TEST_OIDC_PROVIDER]);

    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    keyMaterial = await createOidcTestKeyMaterial();

    const inMemoryJwks = app.get(InMemoryJwksResolverService);
    inMemoryJwks.register(
      TEST_OIDC_PROVIDER.jwksUri,
      createLocalJWKSet({ keys: [keyMaterial.publicJwk] }),
    );
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    delete process.env.OIDC_ENABLED;
    delete process.env.OIDC_PROVIDERS_JSON;
    await app.close();
  });

  it('authenticates via OIDC when subject is explicitly linked', async () => {
    const identity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'OIDC User' },
    });
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: 'ACTIVE',
        oidcProvider: TEST_OIDC_PROVIDER.code,
        oidcSubject: 'linked-subject',
      },
    });

    const token = await signOidcTestToken(keyMaterial, {
      subject: 'linked-subject',
      amr: ['pwd', 'mfa'],
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/oidc')
      .send({ accessToken: token, providerCode: TEST_OIDC_PROVIDER.code })
      .expect(201);

    const login = asLoginResponseBody(loginRes.body);
    expect(login.identityId).toBe(identity.id);
    expect(login.mfaSatisfied).toBe(true);
    expect(login.authMethod).toBe('OIDC');
  });

  it('rejects OIDC authentication for unlinked subject', async () => {
    const token = await signOidcTestToken(keyMaterial, { subject: 'unknown-subject' });

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/oidc')
      .send({ accessToken: token, providerCode: TEST_OIDC_PROVIDER.code })
      .expect(401);
  });

  it('authenticates service identity and does not confer government authority', async () => {
    const identity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'integration-svc' },
    });

    const apiKey = 'integration-service-key-abcdef';
    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: CredentialType.API_KEY,
        apiKey,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/service')
      .send({ clientId: 'integration-svc', clientSecret: apiKey })
      .expect(201);

    const login = asLoginResponseBody(loginRes.body);
    expect(login.identityId).toBe(identity.id);
    expect(login.authMethod).toBe('SERVICE_API_KEY');

    const profileRes = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(200);

    expect(profileRes.body).toMatchObject({
      identityId: identity.id,
      hasGovernmentAuthority: false,
    });
  });

  it('rejects revoked service credential', async () => {
    const identity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'revoked-svc' },
    });

    const credential = await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.API_KEY,
        status: 'REVOKED',
        apiKeyHash: 'deadbeef',
      },
    });

    expect(credential.status).toBe('REVOKED');

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/service')
      .send({ clientId: 'revoked-svc', clientSecret: 'any-secret' })
      .expect(401);
  });
});
