import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  AuthorityConditionType,
  AuthorityEvaluationOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { Phase4TestFixtures } from '../src/authority/fixtures/phase-4-test-fixtures';
import { FunctionActivationService } from '../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../src/authority/governing-sources/governing-sources.service';
import { AuthorityEvaluationStatus } from '../src/authority/policy/authority-evaluation-status.enum';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import { asAuthorityEvaluationBody } from './helpers/authority-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 4F runtime authority evaluation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixtures: Phase4TestFixtures;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    fixtures = new Phase4TestFixtures(
      prisma,
      app.get(GoverningSourcesService),
      app.get(FunctionAuthorityRecordsService),
      app.get(FunctionActivationService),
    );
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function classificationFixture(
    classifications: Awaited<ReturnType<Phase4TestFixtures['seedEightClassifications']>>,
    classification: AuthorityClassification,
  ) {
    const fixture = classifications.find((item) => item.classification === classification);
    if (!fixture) {
      throw new Error(`Missing classification fixture: ${classification}`);
    }
    return fixture;
  }

  async function authenticate(identityId: string, token = 'phase-4f-token') {
    await prisma.session.create({
      data: {
        identityId,
        tokenHash: hashToken(token),
        status: 'ACTIVE',
        assuranceLevel: 'MEDIUM',
        expiresAt: new Date('2099-01-01'),
      },
    });
    return token;
  }

  it('returns structured status on ALLOW without universal permission', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const owned = classificationFixture(classifications, AuthorityClassification.ABSEZ_OWNED);

    const token = await authenticate(ctx.identityId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: owned.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    const body = asAuthorityEvaluationBody(response.body);
    expect(body.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(body.status).toBe(AuthorityEvaluationStatus.ALLOW);
    expect(body.requiresRevalidation).toBe(true);
  });

  it('returns BLOCKED status for prohibited function', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const prohibited = classificationFixture(
      classifications,
      AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED,
    );

    const token = await authenticate(ctx.identityId, 'prohibited-token');

    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: prohibited.functionId,
        action: AuthorityActionType.DECIDE,
      })
      .expect(201);

    const body = asAuthorityEvaluationBody(response.body);
    expect(body.status).toBe(AuthorityEvaluationStatus.BLOCKED);
    expect(body.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.PROHIBITED_FUNCTION,
    );
  });

  it('allows administrative support actions but not DECIDE', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const adminSupport = classificationFixture(
      classifications,
      AuthorityClassification.ADMINISTRATIVE_SUPPORT,
    );

    const token = await authenticate(ctx.identityId, 'admin-support-token');

    const allowResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: adminSupport.functionId,
        action: AuthorityActionType.PREPARE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    expect(asAuthorityEvaluationBody(allowResponse.body).status).toBe(
      AuthorityEvaluationStatus.ALLOW,
    );

    const denyResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: adminSupport.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    expect(asAuthorityEvaluationBody(denyResponse.body).status).toBe(
      AuthorityEvaluationStatus.NOT_AUTHORIZED,
    );
  });

  it('allows technology-assisted retrieval but not final DECIDE', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const techAssist = classificationFixture(
      classifications,
      AuthorityClassification.TECHNOLOGY_ASSISTED,
    );

    const token = await authenticate(ctx.identityId, 'tech-assist-token');

    const assistResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: techAssist.functionId,
        action: AuthorityActionType.RETRIEVE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    expect(asAuthorityEvaluationBody(assistResponse.body).status).toBe(
      AuthorityEvaluationStatus.ALLOW,
    );

    const decideResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: techAssist.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    const body = asAuthorityEvaluationBody(decideResponse.body);
    expect(body.status).not.toBe(AuthorityEvaluationStatus.ALLOW);
    expect(body.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT,
    );
  });

  it('blocks SoD violation via self-approval', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const owned = classificationFixture(classifications, AuthorityClassification.ABSEZ_OWNED);

    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: owned.functionId,
        conditionType: AuthorityConditionType.SELF_APPROVAL_PROHIBITED,
      },
    });

    const token = await authenticate(ctx.identityId, 'sod-token');

    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: owned.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
        isSelfApproval: true,
      })
      .expect(201);

    const body = asAuthorityEvaluationBody(response.body);
    expect(body.status).toBe(AuthorityEvaluationStatus.BLOCKED);
    expect(body.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED,
    );
  });

  it('blocks conflict of interest when flagged', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const owned = classificationFixture(classifications, AuthorityClassification.ABSEZ_OWNED);

    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: owned.functionId,
        conditionType: AuthorityConditionType.CONFLICT_CHECK,
      },
    });

    const token = await authenticate(ctx.identityId, 'conflict-token');

    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionAuthorityRecordId: owned.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        appointmentId: ctx.appointmentId,
        isConflicted: true,
      })
      .expect(201);

    const body = asAuthorityEvaluationBody(response.body);
    expect(body.status).toBe(AuthorityEvaluationStatus.BLOCKED);
    expect(body.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.CONFLICT_DETECTED,
    );
  });
});
