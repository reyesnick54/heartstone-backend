import {
  AccountStatus,
  AuthenticationMethodType,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  IdentityType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_FIXTURE_MARKER } from '../../src/authority/authority.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { generateOpaqueToken, hashToken } from '../../src/identity/common/crypto.util';
import { asLoginResponseBody } from './identity-test-types';

export interface Phase8FixtureContext {
  institutionId: string;
  departmentId: string;
  functionAuthorityRecordId: string;
  governingSourceId: string;
  officialIdentityId: string;
  officialSessionToken: string;
  serviceIdentityId: string;
  serviceSessionToken: string;
}

export async function seedPhase8Fixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<Phase8FixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-P8-JUR`,
      name: 'NON_PRODUCTION Phase 8 Jurisdiction',
      type: 'SPECIAL_ECONOMIC_ZONE',
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-P8-INST`,
      name: 'NON_PRODUCTION Phase 8 Institution',
      type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-P8-DEPT`,
      name: 'NON_PRODUCTION Phase 8 Department',
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-P8-GS`,
      title: 'NON_PRODUCTION Phase 8 Governing Source',
      versionLabel: '1.0',
      effectiveFrom: new Date('2020-01-01'),
      contentHash: 'phase8-fixture-hash',
    },
  });

  const functionAuthorityRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-P8-FAR`,
      name: 'NON_PRODUCTION Phase 8 Decision Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
    },
  });

  await prisma.authorityActionRight.create({
    data: {
      functionAuthorityRecordId: functionAuthorityRecord.id,
      action: AuthorityActionType.DECIDE,
      permitted: true,
      requiresHumanActor: true,
    },
  });

  const person = await prisma.person.create({
    data: { givenName: 'Phase8', familyName: 'Official' },
  });

  const account = await prisma.userAccount.create({
    data: {
      personId: person.id,
      loginIdentifier: `${NON_PRODUCTION_FIXTURE_MARKER}-p8-official@test.local`,
      status: AccountStatus.ACTIVE,
    },
  });

  const officialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      userAccountId: account.id,
      personId: person.id,
      displayName: 'NON_PRODUCTION Phase 8 Official',
    },
  });

  const serviceIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: 'NON_PRODUCTION Phase 8 Service Identity',
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: officialIdentity.id, type: 'PASSWORD', password: 'Official123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: officialIdentity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/identity/auth/login')
    .send({
      loginIdentifier: `${NON_PRODUCTION_FIXTURE_MARKER}-p8-official@test.local`,
      password: 'Official123!',
    })
    .expect(201);

  const serviceSessionToken = generateOpaqueToken();
  await prisma.session.create({
    data: {
      identityId: serviceIdentity.id,
      tokenHash: hashToken(serviceSessionToken),
      expiresAt: new Date('2099-01-01'),
    },
  });

  return {
    institutionId: institution.id,
    departmentId: department.id,
    functionAuthorityRecordId: functionAuthorityRecord.id,
    governingSourceId: governingSource.id,
    officialIdentityId: officialIdentity.id,
    officialSessionToken: asLoginResponseBody(loginResponse.body).sessionToken,
    serviceIdentityId: serviceIdentity.id,
    serviceSessionToken,
  };
}
