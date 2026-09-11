import {
  AccountStatus,
  AuthenticationMethodType,
  AuthorityClassification,
  ControlledFunctionClass,
  IdentityType,
  InstitutionType,
  JurisdictionType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../../src/service-catalog/service-catalog.constants';
import { asLoginResponseBody } from './identity-test-types';

export interface ServiceCatalogFixtureContext {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  serviceFamilyId: string;
  sessionToken: string;
  identityId: string;
}

export async function seedServiceCatalogFixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<ServiceCatalogFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-JUR`,
      name: 'NON_PRODUCTION Service Catalog Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-INST`,
      name: 'NON_PRODUCTION Service Catalog Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-DEPT`,
      name: 'NON_PRODUCTION Service Catalog Department',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-FAMILY`,
      name: 'Corporate Registration',
      description: 'NON_PRODUCTION test family',
    },
  });

  const person = await prisma.person.create({
    data: {
      givenName: 'Catalog',
      familyName: 'Administrator',
    },
  });

  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}@test.gov`,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Catalog Administrator',
      userAccountId: account.id,
      personId: person.id,
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({
      identityId: identity.id,
      type: 'PASSWORD',
      password: 'CatalogAdmin123!',
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
      loginIdentifier: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}@test.gov`,
      password: 'CatalogAdmin123!',
    })
    .expect(201);

  const login = asLoginResponseBody(loginRes.body);

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    departmentId: department.id,
    serviceFamilyId: serviceFamily.id,
    sessionToken: login.sessionToken,
    identityId: identity.id,
  };
}

export async function seedFunctionAuthorityRecord(
  prisma: PrismaService,
  institutionId: string,
  officeId?: string,
): Promise<{ id: string; code: string }> {
  const record = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-FUNC`,
      name: 'NON_PRODUCTION Sample Licensing Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      institutionId,
      officeId,
    },
  });

  return { id: record.id, code: record.code };
}
