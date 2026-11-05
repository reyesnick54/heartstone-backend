import { type INestApplication } from '@nestjs/common';
import { AccountStatus, CredentialType, IdentityType } from '@prisma/client';
import { createLocalJWKSet } from 'jose';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type OidcProviderConfig } from '../src/config/config.constants';
import { type PrismaService } from '../src/database/prisma.service';
import { InMemoryJwksResolverService } from '../src/identity/auth/oidc/jwks-resolver.service';
import { hashExternalSubject } from '../src/identity/auth/oidc/oidc-citizen-provisioning.service';
import { asCitizenMeBody } from './helpers/citizen-experience-test-types';
import { asLoginResponseBody } from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createOidcTestKeyMaterial,
  type OidcTestKeyMaterial,
  signOidcTestToken,
  TEST_OIDC_PROVIDER,
} from './helpers/oidc-test-fixtures';

const SELF_SERVICE_PROVIDER: OidcProviderConfig = {
  ...TEST_OIDC_PROVIDER,
  code: 'citizen-idp',
  name: 'Citizen IdP (self-service)',
  provisioning: { citizenSelfService: true },
};

/** Same issuer and keys, but no provisioning: unlinked subjects must still be refused. */
const LINKED_ONLY_PROVIDER: OidcProviderConfig = {
  ...TEST_OIDC_PROVIDER,
  code: 'official-idp',
  name: 'Official IdP (linked only)',
};

const OIDC_ENV_KEYS = ['OIDC_ENABLED', 'OIDC_PROVIDERS_JSON'] as const;

function restoreEnv(key: (typeof OIDC_ENV_KEYS)[number], value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
  } else {
    process.env[key] = value;
  }
}

describe('Citizen OIDC self-provisioning (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let keyMaterial: OidcTestKeyMaterial;
  const previousEnv: Partial<Record<(typeof OIDC_ENV_KEYS)[number], string | undefined>> = {};

  beforeAll(async () => {
    for (const key of OIDC_ENV_KEYS) {
      previousEnv[key] = process.env[key];
    }
    // Config factories read the environment when the testing module compiles.
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_PROVIDERS_JSON = JSON.stringify([SELF_SERVICE_PROVIDER, LINKED_ONLY_PROVIDER]);

    keyMaterial = await createOidcTestKeyMaterial();
    const integration = await createIntegrationApp();
    app = integration.app;
    prisma = integration.prisma;

    app
      .get(InMemoryJwksResolverService)
      .register(TEST_OIDC_PROVIDER.jwksUri, createLocalJWKSet({ keys: [keyMaterial.publicJwk] }));
  });

  afterAll(async () => {
    await app.close();
    restoreEnv('OIDC_ENABLED', previousEnv.OIDC_ENABLED);
    restoreEnv('OIDC_PROVIDERS_JSON', previousEnv.OIDC_PROVIDERS_JSON);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  async function loginWithOidc(
    providerCode: string,
    subject: string,
    additionalClaims?: Record<string, unknown>,
  ): Promise<request.Response> {
    const accessToken = await signOidcTestToken(keyMaterial, {
      subject,
      amr: ['pwd'],
      additionalClaims,
    });
    return request(app.getHttpServer())
      .post('/api/v1/identity/auth/login/oidc')
      .send({ accessToken, providerCode });
  }

  async function loginExpecting(
    status: number,
    providerCode: string,
    subject: string,
    additionalClaims?: Record<string, unknown>,
  ): Promise<request.Response> {
    const response = await loginWithOidc(providerCode, subject, additionalClaims);
    expect(response.status).toBe(status);
    return response;
  }

  it('provisions a citizen on first login, who can then load their own profile', async () => {
    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-first-login', {
      given_name: 'Ada',
      family_name: 'Citizen',
      name: 'Ada Citizen',
    });

    const { sessionToken, identityId } = asLoginResponseBody(login.body);

    const me = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/me')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(200);

    const body = asCitizenMeBody(me.body);
    expect(body.profile.identityId).toBe(identityId);
    expect(body.accountAssurance.hasGovernmentAuthority).toBe(false);

    const identity = await prisma.identity.findUniqueOrThrow({
      where: { id: identityId },
      include: { person: true, userAccount: true, credentials: true },
    });
    expect(identity.displayName).toBe('Ada Citizen');
    expect(identity.person).toMatchObject({ givenName: 'Ada', familyName: 'Citizen' });
    expect(identity.type).toBe(IdentityType.INDIVIDUAL);
    expect(identity.userAccount?.status).toBe(AccountStatus.ACTIVE);
    expect(identity.userAccount?.loginIdentifier).toBe('citizen-idp:citizen-first-login');
    expect(identity.credentials).toHaveLength(1);
    expect(identity.credentials[0]).toMatchObject({
      type: CredentialType.OIDC,
      oidcProvider: SELF_SERVICE_PROVIDER.code,
      oidcSubject: 'citizen-first-login',
    });
  });

  it('grants no roles, offices, memberships or representative authority', async () => {
    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-no-roles');
    const { identityId } = asLoginResponseBody(login.body);

    await expect(prisma.technicalRoleAssignment.count({ where: { identityId } })).resolves.toBe(0);
    await expect(prisma.identityOfficeholderLink.count({ where: { identityId } })).resolves.toBe(0);
    await expect(prisma.organizationMembership.count({ where: { identityId } })).resolves.toBe(0);
    await expect(prisma.representativeAuthority.count({ where: { identityId } })).resolves.toBe(0);
  });

  it('must fail: a provisioned citizen is refused on a restricted administrative route', async () => {
    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-restricted');
    const { sessionToken } = asLoginResponseBody(login.body);

    await request(app.getHttpServer())
      .get('/api/v1/authority/governing-sources')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(403);
  });

  it('must fail: a provisioned citizen gets MFA_REQUIRED on a step-up route', async () => {
    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-step-up');
    const { sessionToken } = asLoginResponseBody(login.body);

    const response = await request(app.getHttpServer())
      .get('/api/v1/identity/me/step-up-protected')
      .set('Authorization', `Bearer ${sessionToken}`)
      .expect(401);

    expect(response.body).toMatchObject({
      message: 'Multi-factor authentication is required',
      code: 'MFA_REQUIRED',
    });
  });

  it('is idempotent: a second login reuses the identity provisioned by the first', async () => {
    const first = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-repeat');
    const second = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-repeat');

    expect(asLoginResponseBody(second.body).identityId).toBe(
      asLoginResponseBody(first.body).identityId,
    );
    await expect(
      prisma.credential.count({
        where: { oidcProvider: SELF_SERVICE_PROVIDER.code, oidcSubject: 'citizen-repeat' },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.securityAuditEvent.count({ where: { eventType: 'IDENTITY_SELF_PROVISIONED' } }),
    ).resolves.toBe(1);
  });

  it('creates exactly one identity under concurrent first logins', async () => {
    const responses = await Promise.all(
      [1, 2, 3].map(() => loginWithOidc(SELF_SERVICE_PROVIDER.code, 'citizen-concurrent')),
    );

    for (const response of responses) {
      expect(response.status).toBe(201);
    }
    const identityIds = new Set(
      responses.map((response) => asLoginResponseBody(response.body).identityId),
    );
    expect(identityIds.size).toBe(1);
    await expect(
      prisma.userAccount.count({
        where: { loginIdentifier: 'citizen-idp:citizen-concurrent' },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.credential.count({
        where: { oidcProvider: SELF_SERVICE_PROVIDER.code, oidcSubject: 'citizen-concurrent' },
      }),
    ).resolves.toBe(1);
  });

  it('must fail: a provider without citizen self-service still rejects unlinked subjects', async () => {
    await loginExpecting(401, LINKED_ONLY_PROVIDER.code, 'unlinked-official');

    await expect(
      prisma.credential.count({ where: { oidcSubject: 'unlinked-official' } }),
    ).resolves.toBe(0);
  });

  it('audits provisioning with a subject hash and never the raw subject', async () => {
    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-audited');
    const { identityId } = asLoginResponseBody(login.body);

    const event = await prisma.securityAuditEvent.findFirstOrThrow({
      where: { eventType: 'IDENTITY_SELF_PROVISIONED', identityId },
    });
    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.providerCode).toBe(SELF_SERVICE_PROVIDER.code);
    expect(metadata.subjectHash).toBe(
      hashExternalSubject(SELF_SERVICE_PROVIDER.code, 'citizen-audited'),
    );
    expect(JSON.stringify(metadata)).not.toContain('citizen-audited');

    await expect(
      prisma.governmentAuditLedgerEntry.count({
        where: { action: 'IDENTITY_SELF_PROVISIONED', resourceId: event.id },
      }),
    ).resolves.toBe(1);
  });

  it('does not merge with an existing account whose identifier matches the email claim', async () => {
    const existingPerson = await prisma.person.create({
      data: { givenName: 'Existing', familyName: 'Holder' },
    });
    const existingAccount = await prisma.userAccount.create({
      data: {
        loginIdentifier: 'ada@example.org',
        personId: existingPerson.id,
        status: AccountStatus.ACTIVE,
      },
    });
    const existingIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Existing Holder',
        userAccountId: existingAccount.id,
        personId: existingPerson.id,
      },
    });

    const login = await loginExpecting(201, SELF_SERVICE_PROVIDER.code, 'citizen-email-collision', {
      email: 'Ada@Example.org',
      email_verified: false,
    });
    const { identityId } = asLoginResponseBody(login.body);

    expect(identityId).not.toBe(existingIdentity.id);
    await expect(
      prisma.credential.count({ where: { identityId: existingIdentity.id } }),
    ).resolves.toBe(0);

    const duplicate = await prisma.securityAuditEvent.findFirstOrThrow({
      where: { eventType: 'IDENTITY_POSSIBLE_DUPLICATE', identityId },
    });
    const metadata = duplicate.metadata as Record<string, unknown>;
    expect(metadata.matchedUserAccountIds).toEqual([existingAccount.id]);
    expect(metadata.resolution).toBe('NOT_MERGED_REQUIRES_REVIEW');
  });
});
