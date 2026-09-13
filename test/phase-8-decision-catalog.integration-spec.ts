import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  DecisionOutcomeCode,
  DecisionTypeLifecycleStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { DecisionCatalogBoundaryService } from '../src/decisions/common/decision-catalog-boundary.service';
import { DecisionTypeVersionsService } from '../src/decisions/versions/decision-type-versions.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase8Fixture } from './helpers/phase-8-test-fixtures';
import {
  asDecisionTypeBody,
  asDecisionTypeVersionBody,
  asDecisionTypeVersionList,
} from './helpers/phase-8-test-types';

describe('Phase 8A decision catalog (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: DecisionCatalogBoundaryService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    boundary = app.get(DecisionCatalogBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates decision type definitions with unique codes and no final decision records', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/decisions/types')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        code: 'P8-LICENSE-APPROVAL',
        name: 'License Approval Route',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        governingSourceId: fixture.governingSourceId,
      })
      .expect(201);

    expect(asDecisionTypeBody(createResponse.body).code).toBe('P8-LICENSE-APPROVAL');

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/decisions/types')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        code: 'P8-LICENSE-APPROVAL',
        name: 'Duplicate',
        responsibleInstitutionId: fixture.institutionId,
      })
      .expect(409);

    expect((duplicate.body as { code: string }).code).toBe('DECISION_TYPE_CODE_EXISTS');

    await boundary.assertPhase8ADoesNotCreateDecisionEntities();

    const decisionCount = await prisma.decisionTypeDefinition.count();
    expect(decisionCount).toBe(1);
  });

  it('preserves historical versions and enforces configured outcomes', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    const typeResponse = await request(app.getHttpServer())
      .post('/api/v1/decisions/types')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        code: 'P8-ROUTE',
        name: 'Route',
        responsibleInstitutionId: fixture.institutionId,
      })
      .expect(201);

    const typeId = asDecisionTypeBody(typeResponse.body).id;

    const versionOne = await request(app.getHttpServer())
      .post(`/api/v1/decisions/types/${typeId}/versions`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        version: 1,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        requiredAuthorityAction: AuthorityActionType.DECIDE,
        governingSourceId: fixture.governingSourceId,
        decisionStandardDescription: 'Apply ABSEZ licensing standard',
        matterScopeDescription: 'License applications within ABSEZ',
        permissibleOutcomeCodes: [DecisionOutcomeCode.APPROVED, DecisionOutcomeCode.REFUSED],
      })
      .expect(201);

    const versionTwo = await request(app.getHttpServer())
      .post(`/api/v1/decisions/types/${typeId}/versions`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        version: 2,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        requiredAuthorityAction: AuthorityActionType.APPROVE,
        decisionStandardDescription: 'Updated standard',
        matterScopeDescription: 'Updated scope',
        permissibleOutcomeCodes: [DecisionOutcomeCode.APPROVED_WITH_CONDITIONS],
      })
      .expect(201);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/decisions/types/${typeId}/versions`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    const historyVersions = asDecisionTypeVersionList(history.body);
    expect(historyVersions).toHaveLength(2);
    expect(historyVersions.map((item) => item.version)).toEqual([1, 2]);

    const versionsService = app.get(DecisionTypeVersionsService);
    const loadedVersion = await versionsService.findOne(
      asDecisionTypeVersionBody(versionOne.body).id,
    );

    expect(() => {
      versionsService.assertConfiguredOutcome(
        {
          permissibleOutcomes: loadedVersion.permissibleOutcomeCodes.map((code) => ({
            permissibleOutcomeDefinition: { code },
          })),
        } as never,
        DecisionOutcomeCode.DEFERRED,
      );
    }).toThrow(/not configured for this decision type version/i);

    expect(asDecisionTypeVersionBody(versionTwo.body).functionAuthorityRecordId).toBe(
      fixture.functionAuthorityRecordId,
    );
  });

  it('rejects recommendation authority action and service identity activation', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    const typeResponse = await request(app.getHttpServer())
      .post('/api/v1/decisions/types')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        code: 'P8-RECOMMENDATION-ROUTE',
        name: 'Recommendation Route',
        responsibleInstitutionId: fixture.institutionId,
      })
      .expect(201);

    const recommendationTypeId = asDecisionTypeBody(typeResponse.body).id;

    await request(app.getHttpServer())
      .post(`/api/v1/decisions/types/${recommendationTypeId}/versions`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        version: 1,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        requiredAuthorityAction: AuthorityActionType.RECOMMEND,
        decisionStandardDescription: 'Invalid',
        matterScopeDescription: 'Invalid',
        permissibleOutcomeCodes: [DecisionOutcomeCode.APPROVED],
      })
      .expect(400);

    const validVersion = await request(app.getHttpServer())
      .post(`/api/v1/decisions/types/${recommendationTypeId}/versions`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        version: 1,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        requiredAuthorityAction: AuthorityActionType.DECIDE,
        decisionStandardDescription: 'Valid',
        matterScopeDescription: 'Valid',
        permissibleOutcomeCodes: [DecisionOutcomeCode.APPROVED],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/decisions/type-versions/${asDecisionTypeVersionBody(validVersion.body).id}/transitions`,
      )
      .set('Authorization', `Bearer ${fixture.serviceSessionToken}`)
      .send({ targetStatus: DecisionTypeLifecycleStatus.ACTIVE })
      .expect(403);
  });

  it('blocks inactive definitions and non-ACTIVE versions from operational use', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    const type = await prisma.decisionTypeDefinition.create({
      data: {
        code: 'P8-SUSPENDED',
        name: 'Suspended Route',
        responsibleInstitutionId: fixture.institutionId,
        status: StructuralLifecycleStatus.SUSPENDED,
      },
    });

    const version = await prisma.decisionTypeVersion.create({
      data: {
        decisionTypeDefinitionId: type.id,
        version: 1,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        requiredAuthorityAction: AuthorityActionType.DECIDE,
        decisionStandardDescription: 'Standard',
        matterScopeDescription: 'Scope',
        status: DecisionTypeLifecycleStatus.DRAFT,
      },
    });

    expect(() => {
      boundary.assertOperationallyAvailable(
        DecisionTypeLifecycleStatus.DRAFT,
        StructuralLifecycleStatus.SUSPENDED,
      );
    }).toThrow(/cannot be used operationally/i);

    expect(() => {
      boundary.assertVersionMutable(DecisionTypeLifecycleStatus.ACTIVE);
    }).toThrow(/immutable/i);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/decisions/type-versions/${version.id}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    expect(asDecisionTypeVersionBody(fetched.body).status).toBe(DecisionTypeLifecycleStatus.DRAFT);
  });
});
