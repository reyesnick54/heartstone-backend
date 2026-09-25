import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  CredentialStatus,
  IdentityType,
  type PrismaClient,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { hashSecret } from '../../src/identity/common/crypto.util';
import {
  INTEGRATION_ADMIN_PERMISSION_CODES,
} from '../../src/security/technical-permission/technical-permission.constants';
import { asLoginResponseBody } from './identity-test-types';

export interface ProvisionedTestIdentity {
  personId: string;
  userAccountId: string;
  identityId: string;
  loginIdentifier: string;
  password: string;
  sessionToken: string;
}

export async function provisionIdentityViaPrisma(
  prisma: PrismaClient,
  options: {
    loginIdentifier: string;
    password: string;
    givenName?: string;
    familyName?: string;
    displayName?: string;
  },
): Promise<Omit<ProvisionedTestIdentity, 'sessionToken'>> {
  const person = await prisma.person.create({
    data: {
      givenName: options.givenName ?? 'Test',
      familyName: options.familyName ?? 'User',
    },
  });

  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier: options.loginIdentifier,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: options.displayName ?? 'Test User',
      userAccountId: account.id,
      personId: person.id,
    },
  });

  await prisma.credential.create({
    data: {
      identityId: identity.id,
      type: 'PASSWORD',
      status: CredentialStatus.ACTIVE,
      secretHash: await hashSecret(options.password),
    },
  });

  return {
    personId: person.id,
    userAccountId: account.id,
    identityId: identity.id,
    loginIdentifier: options.loginIdentifier,
    password: options.password,
  };
}

export async function loginAndGetSessionToken(
  app: INestApplication<App> | { getHttpServer: () => App },
  loginIdentifier: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/identity/auth/login')
    .send({ loginIdentifier, password })
    .expect(201);

  return asLoginResponseBody(response.body).sessionToken;
}

export async function provisionAuthenticatedIdentity(
  app: INestApplication<App>,
  prisma: PrismaClient,
  options: {
    loginIdentifier: string;
    password: string;
    givenName?: string;
    familyName?: string;
    displayName?: string;
  },
): Promise<ProvisionedTestIdentity> {
  const identity = await provisionIdentityViaPrisma(prisma, options);
  const sessionToken = await loginAndGetSessionToken(
    app,
    identity.loginIdentifier,
    identity.password,
  );

  return {
    ...identity,
    sessionToken,
  };
}

export function authHeader(sessionToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${sessionToken}` };
}

const INTEGRATION_ADMIN_LOGIN = 'integration-admin@test.gov';
const INTEGRATION_ADMIN_PASSWORD = 'IntegrationAdmin123!';

export async function ensureIntegrationAdminTechnicalPermissions(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  for (const permissionCode of INTEGRATION_ADMIN_PERMISSION_CODES) {
    const existing = await prisma.technicalAccessPolicy.findFirst({
      where: { identityId, permissionCode, institutionId: null },
    });
    if (existing) {
      continue;
    }
    await prisma.technicalAccessPolicy.create({
      data: {
        identityId,
        permissionCode,
        scope: 'PLATFORM_WIDE',
      },
    });
  }
}

export async function provisionIntegrationAdminSession(
  app: INestApplication<App>,
  prisma: PrismaClient,
): Promise<ProvisionedTestIdentity> {
  const provisioned = await provisionAuthenticatedIdentity(app, prisma, {
    loginIdentifier: INTEGRATION_ADMIN_LOGIN,
    password: INTEGRATION_ADMIN_PASSWORD,
    displayName: 'Integration Admin',
  });
  await ensureIntegrationAdminTechnicalPermissions(prisma, provisioned.identityId);
  return provisioned;
}

export async function ensureIntegrationAdminSession(
  app: INestApplication<App>,
  prisma: PrismaClient,
): Promise<ProvisionedTestIdentity> {
  const existingAccount = await prisma.userAccount.findUnique({
    where: { loginIdentifier: INTEGRATION_ADMIN_LOGIN },
    include: { identities: true },
  });

  if (existingAccount) {
    const identity = existingAccount.identities[0];
    if (!identity) {
      throw new Error('Integration admin account exists without an identity');
    }

    const sessionToken = await loginAndGetSessionToken(
      app,
      INTEGRATION_ADMIN_LOGIN,
      INTEGRATION_ADMIN_PASSWORD,
    );

    if (!existingAccount.personId) {
      throw new Error('Integration admin account exists without a person');
    }

    await ensureIntegrationAdminTechnicalPermissions(prisma, identity.id);

    return {
      personId: existingAccount.personId,
      userAccountId: existingAccount.id,
      identityId: identity.id,
      loginIdentifier: INTEGRATION_ADMIN_LOGIN,
      password: INTEGRATION_ADMIN_PASSWORD,
      sessionToken,
    };
  }

  try {
    return await provisionIntegrationAdminSession(app, prisma);
  } catch (error) {
    const isDuplicateLogin =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002';

    if (!isDuplicateLogin) {
      throw error;
    }

    const sessionToken = await loginAndGetSessionToken(
      app,
      INTEGRATION_ADMIN_LOGIN,
      INTEGRATION_ADMIN_PASSWORD,
    );
    const account = await prisma.userAccount.findUniqueOrThrow({
      where: { loginIdentifier: INTEGRATION_ADMIN_LOGIN },
      include: { identities: true },
    });
    const identity = account.identities[0];
    if (!identity) {
      throw new Error('Integration admin account exists without an identity');
    }

    if (!account.personId) {
      throw new Error('Integration admin account exists without a person');
    }

    await ensureIntegrationAdminTechnicalPermissions(prisma, identity.id);

    return {
      personId: account.personId,
      userAccountId: account.id,
      identityId: identity.id,
      loginIdentifier: INTEGRATION_ADMIN_LOGIN,
      password: INTEGRATION_ADMIN_PASSWORD,
      sessionToken,
    };
  }
}

export async function createPasswordCredentialViaPrisma(
  prisma: PrismaClient,
  identityId: string,
  password: string,
): Promise<void> {
  await prisma.credential.create({
    data: {
      identityId,
      type: 'PASSWORD',
      status: CredentialStatus.ACTIVE,
      secretHash: await hashSecret(password),
    },
  });
}

export async function createPasswordAuthenticationMethodViaPrisma(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  await prisma.authenticationMethod.create({
    data: {
      identityId,
      type: AuthenticationMethodType.PASSWORD,
    },
  });
}
