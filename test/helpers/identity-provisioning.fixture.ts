import {
  AccountStatus,
  AuthenticationMethodType,
  CredentialStatus,
  IdentityType,
  type PrismaClient,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';
import { type INestApplication } from '@nestjs/common';

import { hashSecret } from '../../src/identity/common/crypto.util';
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
  app: INestApplication<App>,
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
