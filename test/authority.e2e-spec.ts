import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  AuthorityEvaluationOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_FIXTURE_MARKER } from '../src/authority/authority.constants';
import { Phase4TestFixtures } from '../src/authority/fixtures/phase-4-test-fixtures';
import { FunctionActivationService } from '../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../src/authority/governing-sources/governing-sources.service';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import {
  asAuthorityEvaluationBody,
  asFunctionAuthorityRecordBody,
} from './helpers/authority-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Authority Engine (e2e)', () => {
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

  it('positive E2E: authenticated human through evaluation ALLOW', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const owned = classificationFixture(classifications, AuthorityClassification.ABSEZ_OWNED);
    expect(owned.marker).toBe(NON_PRODUCTION_FIXTURE_MARKER);

    const token = hashToken('authority-e2e-token');
    await prisma.session.create({
      data: {
        identityId: ctx.identityId,
        tokenHash: token,
        status: 'ACTIVE',
        assuranceLevel: 'MEDIUM',
        expiresAt: new Date('2099-01-01'),
      },
    });

    const allowResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', 'Bearer authority-e2e-token')
      .send({
        functionAuthorityRecordId: owned.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    expect(asAuthorityEvaluationBody(allowResponse.body).outcome).toBe(
      AuthorityEvaluationOutcome.ALLOW,
    );

    const otherFunction = classificationFixture(
      classifications,
      AuthorityClassification.ADMINISTRATIVE_SUPPORT,
    );

    const denyOther = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', 'Bearer authority-e2e-token')
      .send({
        functionAuthorityRecordId: otherFunction.functionId,
        action: AuthorityActionType.DECIDE,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
      })
      .expect(201);

    expect(asAuthorityEvaluationBody(denyOther.body).outcome).toBe(AuthorityEvaluationOutcome.DENY);
  });

  it('delegated function requires and loses delegation', async () => {
    const ctx = await fixtures.seedStructuralContext();
    const classifications = await fixtures.seedEightClassifications(ctx);
    const delegated = classificationFixture(
      classifications,
      AuthorityClassification.ABSEZ_DELEGATED,
    );

    const token = hashToken('delegation-e2e-token');
    await prisma.session.create({
      data: {
        identityId: ctx.identityId,
        tokenHash: token,
        status: 'ACTIVE',
        assuranceLevel: 'MEDIUM',
        expiresAt: new Date('2099-01-01'),
      },
    });

    const withDelegation = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', 'Bearer delegation-e2e-token')
      .send({
        functionAuthorityRecordId: delegated.functionId,
        action: AuthorityActionType.APPROVE,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
        delegationId: ctx.delegationId,
      })
      .expect(201);
    expect(asAuthorityEvaluationBody(withDelegation.body).outcome).toBe(
      AuthorityEvaluationOutcome.ALLOW,
    );

    await prisma.delegation.update({
      where: { id: ctx.delegationId },
      data: { status: 'REVOKED' },
    });

    const afterRevoke = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', 'Bearer delegation-e2e-token')
      .send({
        functionAuthorityRecordId: delegated.functionId,
        action: AuthorityActionType.APPROVE,
        officeholderId: ctx.officeholderId,
        officeId: ctx.officeId,
        appointmentId: ctx.appointmentId,
        delegationId: ctx.delegationId,
      })
      .expect(201);
    expect(asAuthorityEvaluationBody(afterRevoke.body).outcome).toBe(
      AuthorityEvaluationOutcome.DENY,
    );
  });

  it('function cannot be activated through ordinary create endpoint', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .send({
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-DRAFT`,
        name: 'Draft Function',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: 'OTHER',
      })
      .expect(201);

    const body = asFunctionAuthorityRecordBody(created.body);
    expect(body.lifecycleStatus).toBe('DRAFT');
    expect(body.activatedAt).toBeNull();
  });
});
