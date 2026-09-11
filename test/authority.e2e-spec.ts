import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  AuthorityClassification,
  AuthorityLifecycleState,
  ControlledFunctionClass,
  IdentityType,
  InstitutionType,
  JurisdictionType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  canSupportOperationalAuthorityEvaluation,
  isNonOperationalLifecycleState,
  isOperationallyActiveLifecycleState,
} from '../src/authority/common/authority-lifecycle.util';
import { type PrismaService } from '../src/database/prisma.service';
import { AuthorityBoundaryService } from '../src/identity/common/authority-boundary.service';
import {
  asFunctionAuthorityRecordBody,
  asFunctionAuthorityRecordListBody,
} from './helpers/authority-test-types';
import { asInstitutionBody, asJurisdictionBody } from './helpers/government-test-types';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 4A Authority register E2E acceptance', () => {
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

  it('accepts all authority classifications and lifecycle states in the register', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Auth', familyName: 'Registrar' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'auth.registrar@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'Auth Registrar',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: 'PASSWORD',
        password: 'AuthRegPass123!',
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
        loginIdentifier: 'auth.registrar@test.gov',
        password: 'AuthRegPass123!',
      })
      .expect(201);
    const authorization = `Bearer ${asLoginResponseBody(loginRes.body).sessionToken}`;

    const jurisdictionRes = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'AG-SEZ',
        name: 'Antigua Special Economic Zone',
        type: JurisdictionType.SPECIAL_ECONOMIC_ZONE,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(jurisdictionRes.body);

    const institutionRes = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'ABSEZ-REG',
        name: 'ABSEZ Regulatory Authority',
        type: InstitutionType.SPECIAL_ECONOMIC_ZONE_AUTHORITY,
      })
      .expect(201);
    const institution = asInstitutionBody(institutionRes.body);

    const classifications = Object.values(AuthorityClassification);
    const lifecycleStates = Object.values(AuthorityLifecycleState).filter(
      (state) => state !== AuthorityLifecycleState.ACTIVE,
    );

    for (const [index, classification] of classifications.entries()) {
      const lifecycleState = lifecycleStates[index % lifecycleStates.length]!;

      await request(app.getHttpServer())
        .post('/api/v1/authority/functions')
        .set('Authorization', authorization)
        .send({
          code: `FN-${classification}`,
          name: `Function ${classification}`,
          functionClass: ControlledFunctionClass.INFORMATION_AND_GUIDANCE,
          authorityClassification: classification,
          lifecycleState,
          institutionId: institution.id,
        })
        .expect(201);
    }

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .expect(200);

    expect(asFunctionAuthorityRecordListBody(listRes.body)).toHaveLength(classifications.length);
  });

  it('confirms register records do not imply operational authority evaluation in Phase 4A', async () => {
    expect(isNonOperationalLifecycleState(AuthorityLifecycleState.RECOGNIZED)).toBe(true);
    expect(isOperationallyActiveLifecycleState(AuthorityLifecycleState.RECOGNIZED)).toBe(false);
    expect(
      canSupportOperationalAuthorityEvaluation(
        AuthorityLifecycleState.SUSPENDED,
        AuthorityClassification.ABSEZ_OWNED,
      ),
    ).toBe(false);
    expect(
      canSupportOperationalAuthorityEvaluation(
        AuthorityLifecycleState.ACTIVE,
        AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED,
      ),
    ).toBe(false);

    const authorityBoundary = app.get(AuthorityBoundaryService);
    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: 'any-identity',
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();

    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'No', familyName: 'Authority' })
      .expect(201);

    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'no.authority@test.gov',
        personId: person.id,
        status: AccountStatus.ACTIVE,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'No Authority',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: 'PASSWORD',
        password: 'NoAuthPass123!',
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
        loginIdentifier: 'no.authority@test.gov',
        password: 'NoAuthPass123!',
      })
      .expect(201);
    const authorization = `Bearer ${asLoginResponseBody(loginRes.body).sessionToken}`;

    const jurisdictionRes = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'AG-SEZ-2',
        name: 'Antigua SEZ Two',
        type: JurisdictionType.SPECIAL_ECONOMIC_ZONE,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(jurisdictionRes.body);

    const institutionRes = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'ABSEZ-2',
        name: 'ABSEZ Two',
        type: InstitutionType.AGENCY,
      })
      .expect(201);
    const institution = asInstitutionBody(institutionRes.body);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({
        code: 'REGISTERED-BUT-NOT-GRANTED',
        name: 'Registered Function Entry',
        functionClass: ControlledFunctionClass.ISSUANCE,
        authorityClassification: AuthorityClassification.ABSEZ_OWNED,
        lifecycleState: AuthorityLifecycleState.RECOGNIZED,
        institutionId: institution.id,
      })
      .expect(201);

    const record = asFunctionAuthorityRecordBody(createRes.body);
    expect(record.lifecycleState).toBe(AuthorityLifecycleState.RECOGNIZED);
    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId: identity.id,
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();
  });
});
