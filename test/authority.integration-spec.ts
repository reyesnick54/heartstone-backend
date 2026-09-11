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

import { type PrismaService } from '../src/database/prisma.service';
import { AuthorityBoundaryService } from '../src/identity/common/authority-boundary.service';
import {
  asFunctionAuthorityRecordBody,
  asFunctionAuthorityRecordListBody,
} from './helpers/authority-test-types';
import {
  asDepartmentBody,
  asInstitutionBody,
  asJurisdictionBody,
} from './helpers/government-test-types';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

async function createAuthenticatedSession(
  app: INestApplication<App>,
): Promise<{ authorization: string; identityId: string }> {
  const personRes = await request(app.getHttpServer())
    .post('/api/v1/identity/persons')
    .send({ givenName: 'Reg', familyName: 'Admin' })
    .expect(201);
  const person = asPersonBody(personRes.body);

  const accountRes = await request(app.getHttpServer())
    .post('/api/v1/identity/user-accounts')
    .send({
      loginIdentifier: 'reg.admin@test.gov',
      personId: person.id,
      status: AccountStatus.ACTIVE,
    })
    .expect(201);
  const account = asUserAccountBody(accountRes.body);

  const identityRes = await request(app.getHttpServer())
    .post('/api/v1/identity/identities')
    .send({
      type: IdentityType.INDIVIDUAL,
      displayName: 'Reg Admin',
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
      password: 'RegAdminPass123!',
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
      loginIdentifier: 'reg.admin@test.gov',
      password: 'RegAdminPass123!',
    })
    .expect(201);
  const login = asLoginResponseBody(loginRes.body);

  return {
    authorization: `Bearer ${login.sessionToken}`,
    identityId: identity.id,
  };
}

async function seedInstitutionStructure(app: INestApplication<App>): Promise<{
  institutionId: string;
  departmentId: string;
}> {
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

  const departmentRes = await request(app.getHttpServer())
    .post('/api/v1/departments')
    .send({
      institutionId: institution.id,
      code: 'LIC',
      name: 'Licensing Division',
    })
    .expect(201);
  const department = asDepartmentBody(departmentRes.body);

  return {
    institutionId: institution.id,
    departmentId: department.id,
  };
}

describe('Phase 4A Authority register (integration)', () => {
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

  it('requires authenticated access for authority register endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/authority/functions').expect(401);
  });

  it('persists function authority records with institution and department relations', async () => {
    const { authorization } = await createAuthenticatedSession(app);
    const { institutionId, departmentId } = await seedInstitutionStructure(app);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({
        code: 'LIC-ELIGIBILITY-SCREEN',
        name: 'License Eligibility Screening',
        functionClass: ControlledFunctionClass.ELIGIBILITY_SCREENING,
        authorityClassification: AuthorityClassification.ABSEZ_OWNED,
        lifecycleState: AuthorityLifecycleState.RECOGNIZED,
        institutionId,
        departmentId,
      })
      .expect(201);

    const record = asFunctionAuthorityRecordBody(createRes.body);
    expect(record).toMatchObject({
      code: 'LIC-ELIGIBILITY-SCREEN',
      institutionId,
      departmentId,
      lifecycleState: AuthorityLifecycleState.RECOGNIZED,
      authorityClassification: AuthorityClassification.ABSEZ_OWNED,
    });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .query({ institutionId })
      .expect(200);

    expect(asFunctionAuthorityRecordListBody(listRes.body)).toHaveLength(1);
  });

  it('enforces unique function codes', async () => {
    const { authorization } = await createAuthenticatedSession(app);
    const { institutionId } = await seedInstitutionStructure(app);

    const payload = {
      code: 'LIC-UNIQUE-CODE',
      name: 'Unique Function',
      functionClass: ControlledFunctionClass.APPLICANT_INTAKE,
      authorityClassification: AuthorityClassification.ADMINISTRATIVE_SUPPORT,
      institutionId,
    };

    await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({ ...payload, name: 'Duplicate' })
      .expect(409);
  });

  it('does not grant authority to users or create appointments/delegations when registering a function', async () => {
    const { authorization, identityId } = await createAuthenticatedSession(app);
    const { institutionId } = await seedInstitutionStructure(app);

    const beforeAppointments = await prisma.appointment.count();
    const beforeDelegations = await prisma.delegation.count();

    await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({
        code: 'LIC-INTAKE',
        name: 'Applicant Intake',
        functionClass: ControlledFunctionClass.APPLICANT_INTAKE,
        authorityClassification: AuthorityClassification.ABSEZ_DELEGATED,
        lifecycleState: AuthorityLifecycleState.ACTIVE,
        institutionId,
      })
      .expect(201);

    expect(await prisma.appointment.count()).toBe(beforeAppointments);
    expect(await prisma.delegation.count()).toBe(beforeDelegations);

    const authorityBoundary = app.get(AuthorityBoundaryService);
    expect(
      authorityBoundary.resolveGovernmentAuthority({
        identityId,
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();
  });

  it('preserves register history through lifecycle patch without delete endpoint', async () => {
    const { authorization } = await createAuthenticatedSession(app);
    const { institutionId } = await seedInstitutionStructure(app);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({
        code: 'LIC-DECISION',
        name: 'Administrative Decision',
        functionClass: ControlledFunctionClass.ADMINISTRATIVE_DECISION,
        authorityClassification: AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL,
        lifecycleState: AuthorityLifecycleState.REVIEWED,
        institutionId,
      })
      .expect(201);

    const record = asFunctionAuthorityRecordBody(createRes.body);

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${record.id}`)
      .set('Authorization', authorization)
      .send({ lifecycleState: AuthorityLifecycleState.SUSPENDED })
      .expect(200);

    expect(asFunctionAuthorityRecordBody(patchRes.body).lifecycleState).toBe(
      AuthorityLifecycleState.SUSPENDED,
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/authority/functions/${record.id}`)
      .set('Authorization', authorization)
      .expect(404);
  });
});
