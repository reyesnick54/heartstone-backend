import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  AuthorityClassification,
  AuthorityLifecycleState,
  ControlledFunctionClass,
  CredentialStatus,
  CredentialType,
  FunctionSourceInterpretationStatus,
  FunctionSourceRelationshipType,
  GoverningSourceRelationshipType,
  GoverningSourceStatus,
  GoverningSourceType,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  SourceAuthenticationStatus,
  SourceFoundationValidity,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import type { PrismaService } from '../src/database/prisma.service';
import {
  asFunctionAuthorityRecordBody,
  asFunctionGoverningSourceBody,
  asFunctionGoverningSourceListBody,
  asGoverningSourceBody,
  asGoverningSourceRelationshipListBody,
  asSourceFoundationEvaluationBody,
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
import {
  createIntegrationApp,
  resetAllTestData,
  resetAuthoritySourceData,
} from './helpers/integration-app';

async function createAuthenticatedSession(
  app: INestApplication<App>,
): Promise<{ authorization: string; identityId: string }> {
  const personRes = await request(app.getHttpServer())
    .post('/api/v1/identity/persons')
    .send({ givenName: 'Source', familyName: 'Admin' })
    .expect(201);
  const person = asPersonBody(personRes.body);

  const accountRes = await request(app.getHttpServer())
    .post('/api/v1/identity/user-accounts')
    .send({
      loginIdentifier: 'source.admin@test.gov',
      personId: person.id,
      status: AccountStatus.ACTIVE,
    })
    .expect(201);
  const account = asUserAccountBody(accountRes.body);

  const identityRes = await request(app.getHttpServer())
    .post('/api/v1/identity/identities')
    .send({
      type: IdentityType.INDIVIDUAL,
      displayName: 'Source Admin',
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
      password: 'SourceAdmin123!',
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
      loginIdentifier: 'source.admin@test.gov',
      password: 'SourceAdmin123!',
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

describe('Authority governing sources (Phase 4B)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authorization: string;
  let actorIdentityId: string;
  let institutionId: string;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const session = await createAuthenticatedSession(app);
    authorization = session.authorization;
    actorIdentityId = session.identityId;
    const structure = await seedInstitutionStructure(app);
    institutionId = structure.institutionId;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createFunction(code = 'FN-TEST') {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', authorization)
      .send({
        code,
        name: 'Test Function',
        functionClass: ControlledFunctionClass.ELIGIBILITY_SCREENING,
        authorityClassification: AuthorityClassification.ABSEZ_OWNED,
        lifecycleState: AuthorityLifecycleState.RECOGNIZED,
        institutionId,
      })
      .expect(201);

    return asFunctionAuthorityRecordBody(response.body);
  }

  async function createSource(
    overrides: {
      sourceCode?: string;
      authenticationStatus?: SourceAuthenticationStatus;
      sourceStatus?: GoverningSourceStatus;
      commencementDate?: string;
      expiryDate?: string;
    } = {},
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/governing-sources')
      .set('Authorization', authorization)
      .send({
        sourceCode: overrides.sourceCode ?? 'ACT-2024-001',
        title: 'Test Legislation',
        sourceType: GoverningSourceType.LEGISLATION,
        commencementDate: overrides.commencementDate ?? '2020-01-01',
        expiryDate: overrides.expiryDate,
      })
      .expect(201);

    const source = asGoverningSourceBody(response.body);

    if (overrides.authenticationStatus) {
      await request(app.getHttpServer())
        .patch(`/api/v1/authority/governing-sources/${source.id}/authentication`)
        .set('Authorization', authorization)
        .send({ authenticationStatus: overrides.authenticationStatus })
        .expect(200);
    }

    if (overrides.sourceStatus) {
      await request(app.getHttpServer())
        .patch(`/api/v1/authority/governing-sources/${source.id}/status`)
        .set('Authorization', authorization)
        .send({ sourceStatus: overrides.sourceStatus })
        .expect(200);
    }

    return source;
  }

  async function linkSource(functionId: string, governingSourceId: string, isPrimary = true) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/authority/functions/${functionId}/governing-sources`)
      .set('Authorization', authorization)
      .send({
        governingSourceId,
        relationshipType: FunctionSourceRelationshipType.PRIMARY_BASIS,
        isPrimary,
        provisionCitation: 'Section 1',
      })
      .expect(201);

    return asFunctionGoverningSourceBody(response.body);
  }

  async function authenticateValidPrimary(functionId: string) {
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });
    const link = await linkSource(functionId, source.id, true);
    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${functionId}/governing-sources/${link.id}`)
      .set('Authorization', authorization)
      .send({
        interpretationStatus: FunctionSourceInterpretationStatus.RESOLVED,
        actorIdentityId,
      })
      .expect(200);
    return source;
  }

  it('valid authenticated source linkage supports active use evaluation', async () => {
    const fn = await createFunction();
    await authenticateValidPrimary(fn.id);

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.VALID,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${fn.id}`)
      .set('Authorization', authorization)
      .send({ lifecycleState: AuthorityLifecycleState.ACTIVE })
      .expect(200);
  });

  it('unauthenticated source does not support active use', async () => {
    const fn = await createFunction();
    const source = await createSource();
    await linkSource(fn.id, source.id);

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.INVALID,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${fn.id}`)
      .set('Authorization', authorization)
      .send({ lifecycleState: AuthorityLifecycleState.ACTIVE })
      .expect(400);
  });

  it('linking a source does not automatically activate the function', async () => {
    const fn = await createFunction();
    await authenticateValidPrimary(fn.id);

    const recordResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asFunctionAuthorityRecordBody(recordResponse.body).lifecycleState).toBe(
      AuthorityLifecycleState.RECOGNIZED,
    );
  });

  it('expired source fails validity', async () => {
    const fn = await createFunction();
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.EXPIRED,
      expiryDate: '2020-01-01',
    });
    await linkSource(fn.id, source.id);

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.EXPIRED,
    );
  });

  it('revoked source fails validity', async () => {
    const fn = await createFunction();
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.REVOKED,
    });
    await linkSource(fn.id, source.id);

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.INVALID,
    );
  });

  it('superseded source remains historically retrievable', async () => {
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.SUPERSEDED,
    });

    const retrievedResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/governing-sources/${source.id}`)
      .set('Authorization', authorization)
      .expect(200);

    const retrieved = asGoverningSourceBody(retrievedResponse.body);
    expect(retrieved.sourceStatus).toBe(GoverningSourceStatus.SUPERSEDED);
    expect(retrieved.id).toBe(source.id);
  });

  it('future commencement does not support current operation', async () => {
    const fn = await createFunction();
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.NOT_YET_EFFECTIVE,
      commencementDate: '2099-01-01',
    });
    await linkSource(fn.id, source.id);

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.INVALID,
    );
  });

  it('source conflict is not silently resolved', async () => {
    const fn = await createFunction();
    const sourceA = await createSource({
      sourceCode: 'ACT-A',
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });
    const sourceB = await createSource({
      sourceCode: 'ACT-B',
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });

    const linkA = await linkSource(fn.id, sourceA.id, true);
    await linkSource(fn.id, sourceB.id, true);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${fn.id}/governing-sources/${linkA.id}`)
      .set('Authorization', authorization)
      .send({
        interpretationStatus: FunctionSourceInterpretationStatus.RESOLVED,
        actorIdentityId,
      });

    const evaluationResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/source-foundation`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asSourceFoundationEvaluationBody(evaluationResponse.body).validity).toBe(
      SourceFoundationValidity.CONFLICTING,
    );
  });

  it('source relationship history is preserved', async () => {
    const original = await createSource({ sourceCode: 'ACT-ORIG' });
    const successor = await createSource({ sourceCode: 'ACT-NEW' });

    await request(app.getHttpServer())
      .post(`/api/v1/authority/governing-sources/${successor.id}/relationships`)
      .set('Authorization', authorization)
      .send({
        relatedSourceId: original.id,
        relationshipType: GoverningSourceRelationshipType.SUPERSEDES,
      })
      .expect(201);

    const relationshipsResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/governing-sources/${successor.id}/relationships`)
      .set('Authorization', authorization)
      .expect(200);

    const relationships = asGoverningSourceRelationshipListBody(relationshipsResponse.body);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]?.relationshipType).toBe(GoverningSourceRelationshipType.SUPERSEDES);
  });

  it('function may have multiple sources', async () => {
    const fn = await createFunction();
    const primary = await createSource({
      sourceCode: 'ACT-PRIMARY',
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });
    const supporting = await createSource({
      sourceCode: 'GUIDE-001',
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });

    await linkSource(fn.id, primary.id, true);
    await request(app.getHttpServer())
      .post(`/api/v1/authority/functions/${fn.id}/governing-sources`)
      .set('Authorization', authorization)
      .send({
        governingSourceId: supporting.id,
        relationshipType: FunctionSourceRelationshipType.SUPPORTING,
        isPrimary: false,
      })
      .expect(201);

    const crosswalkResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/functions/${fn.id}/governing-sources`)
      .set('Authorization', authorization)
      .expect(200);

    expect(asFunctionGoverningSourceListBody(crosswalkResponse.body)).toHaveLength(2);
  });

  it('removing technical access does not modify governing source', async () => {
    const source = await createSource({ sourceCode: 'ACT-PERSIST' });

    await prisma.credential.updateMany({
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });
    await prisma.session.updateMany({
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/authority/governing-sources/${source.id}`)
      .set('Authorization', authorization)
      .expect(401);

    const stored = await prisma.governingSource.findUnique({ where: { id: source.id } });
    expect(stored?.sourceCode).toBe('ACT-PERSIST');
    expect(stored?.sourceStatus).toBe(GoverningSourceStatus.IDENTIFIED);
  });

  it('adding software permission cannot create a governing source', async () => {
    const before = await prisma.governingSource.count();
    const serviceIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: 'Reporting Service',
      },
    });
    await prisma.credential.create({
      data: {
        identityId: serviceIdentity.id,
        type: CredentialType.API_KEY,
        status: CredentialStatus.ACTIVE,
      },
    });

    expect(await prisma.governingSource.count()).toBe(before);
  });

  it('contested authority cannot be resolved automatically without actor', async () => {
    const fn = await createFunction();
    const source = await createSource({
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
    });
    const link = await linkSource(fn.id, source.id);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${fn.id}/governing-sources/${link.id}`)
      .set('Authorization', authorization)
      .send({ interpretationStatus: FunctionSourceInterpretationStatus.CONTESTED })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${fn.id}/governing-sources/${link.id}`)
      .set('Authorization', authorization)
      .send({ interpretationStatus: FunctionSourceInterpretationStatus.RESOLVED })
      .expect(400);
  });

  it('emits audit events for consequential source changes', async () => {
    const source = await createSource({ sourceCode: 'ACT-AUDIT' });

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authentication`)
      .set('Authorization', authorization)
      .send({ authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED })
      .expect(200);

    const events = await prisma.securityAuditEvent.findMany({
      where: { eventType: 'GOVERNING_SOURCE_AUTHENTICATION_UPDATED' },
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.metadata).toMatchObject({
      governingSourceId: source.id,
      newAuthenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
    });
  });

  it('preserves governing source records through status transitions without deletion', async () => {
    const source = await createSource({ sourceCode: 'ACT-HIST' });
    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/status`)
      .set('Authorization', authorization)
      .send({ sourceStatus: GoverningSourceStatus.SUPERSEDED })
      .expect(200);

    const stored = await prisma.governingSource.findUnique({ where: { id: source.id } });
    expect(stored?.sourceStatus).toBe(GoverningSourceStatus.SUPERSEDED);

    await resetAuthoritySourceData(prisma);
    expect(await prisma.governingSource.count({ where: { sourceCode: 'ACT-HIST' } })).toBe(0);
  });
});
