import { type INestApplication } from '@nestjs/common';
import { AuthorityClassification, ControlledFunctionClass, IdentityType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { CUSTOMS_TRADE_AUTHORITY_FUNCTION_CODES } from '../src/customs-trade/customs-trade.constants';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import { CLINICAL_RESEARCH_AUTHORITY_FUNCTION_CODES } from '../src/healthcare/research/clinical-research.constants';
import { LABOUR_AUTHORITY_FUNCTION_CODES } from '../src/labour/labour.constants';
import { REVENUE_AUTHORITY_FUNCTION_CODES } from '../src/revenue/revenue.constants';
import { SOCIAL_PROTECTION_AUTHORITY_FUNCTION_CODES } from '../src/social-protection/social-protection.constants';
import {
  authHeader,
  provisionAuthenticatedIdentity,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('S5 consequential coverage must-fail (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let functionRecords: FunctionAuthorityRecordsService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    functionRecords = app.get(FunctionAuthorityRecordsService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedFunctionCode(code: string) {
    const existing = await prisma.functionAuthorityRecord.findFirst({ where: { code } });
    if (existing) {
      return existing.id;
    }
    const record = await functionRecords.create({
      code,
      name: code,
      description: 'S5 test function',
      classification: AuthorityClassification.INSTITUTION_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
    });
    return record.id;
  }

  async function provisionServiceSession() {
    const clientId = 's5-service-bot';
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: clientId,
      },
    });
    const sessionToken = 's5-service-session-token';
    await prisma.session.create({
      data: {
        identityId: identity.id,
        tokenHash: hashToken(sessionToken),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });
    return sessionToken;
  }

  it('denies service identity from benefit award (human-reserved)', async () => {
    await seedFunctionCode(SOCIAL_PROTECTION_AUTHORITY_FUNCTION_CODES.BENEFIT_AWARD);
    const serviceToken = await provisionServiceSession();

    await request(app.getHttpServer())
      .post('/api/v1/social-protection/benefit-awards')
      .set(authHeader(serviceToken))
      .send({
        benefitProgramId: '00000000-0000-0000-0000-000000000001',
        benefitProgramVersionId: '00000000-0000-0000-0000-000000000002',
        actorPersona: 'BENEFIT_DECISION_OFFICER',
        humanDecisionRecorded: true,
      })
      .expect(403);
  });

  it('denies service identity from work permit approval', async () => {
    await seedFunctionCode(LABOUR_AUTHORITY_FUNCTION_CODES.WORK_PERMIT_APPROVE);
    const serviceToken = await provisionServiceSession();

    await request(app.getHttpServer())
      .post('/api/v1/labour/work-permits/00000000-0000-0000-0000-000000000003/approve')
      .set(authHeader(serviceToken))
      .send({ governmentDecisionId: '00000000-0000-0000-0000-000000000004' })
      .expect(403);
  });

  it('denies service identity from tax assessment issuance', async () => {
    await seedFunctionCode(REVENUE_AUTHORITY_FUNCTION_CODES.TAX_ASSESSMENT_ISSUE);
    const serviceToken = await provisionServiceSession();

    await request(app.getHttpServer())
      .post('/api/v1/revenue/tax-assessments/issue')
      .set(authHeader(serviceToken))
      .send({
        taxpayerAccountId: '00000000-0000-0000-0000-000000000005',
        taxTypeDefinitionId: '00000000-0000-0000-0000-000000000006',
        taxPeriodId: '00000000-0000-0000-0000-000000000007',
        calculationRecordId: '00000000-0000-0000-0000-000000000008',
        issuedByOfficeholderId: '00000000-0000-0000-0000-000000000009',
        lines: [],
      })
      .expect(403);
  });

  it('denies service identity from customs release authorization', async () => {
    await seedFunctionCode(CUSTOMS_TRADE_AUTHORITY_FUNCTION_CODES.CARGO_RELEASE_AUTHORIZE);
    const serviceToken = await provisionServiceSession();

    await request(app.getHttpServer())
      .post('/api/v1/customs-trade/shipments/00000000-0000-0000-0000-000000000010/release')
      .set(authHeader(serviceToken))
      .send({ authorizedByOfficeholderId: '00000000-0000-0000-0000-000000000011' })
      .expect(403);
  });

  it('denies service identity from clinical ethics approval', async () => {
    await seedFunctionCode(CLINICAL_RESEARCH_AUTHORITY_FUNCTION_CODES.ETHICS_APPROVAL);
    const serviceToken = await provisionServiceSession();

    await request(app.getHttpServer())
      .post('/api/v1/clinical-research/ethics-approvals/versions')
      .set(authHeader(serviceToken))
      .send({
        ethicsBoardReference: 'EB-1',
        protocolVersionId: '00000000-0000-0000-0000-000000000012',
      })
      .expect(403);
  });

  it('denies unauthenticated compliance enforcement finalization', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/compliance/reviews/finalize')
      .send({ reviewId: '00000000-0000-0000-0000-000000000013' })
      .expect(401);
  });

  it('denies authenticated citizen without authority from compliance enforcement', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 's5-citizen@test.gov',
      password: 'CitizenUser123!',
    });

    await request(app.getHttpServer())
      .post('/api/v1/compliance/reviews/finalize')
      .set(authHeader(citizen.sessionToken))
      .send({
        reviewId: '00000000-0000-0000-0000-000000000014',
        reviewerOfficeholderId: '00000000-0000-0000-0000-000000000015',
      })
      .expect(403);
  });
});
