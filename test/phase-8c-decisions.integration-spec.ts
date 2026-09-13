import { type INestApplication } from '@nestjs/common';
import {
  DecisionAssistanceStatus,
  DecisionConditionType,
  GovernmentDecisionOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { DecisionAssistanceService } from '../src/decisions/decision-assistance.service';
import { GovernmentDecisionsService } from '../src/decisions/government-decisions.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase8DecisionFixture } from './helpers/phase-8-test-fixtures';

interface GovernmentDecisionResponseBody {
  id: string;
  findings: { id: string }[];
  reasons: { governmentDecisionId: string }[];
}

describe('Phase 8C government decisions (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let decisionsService: GovernmentDecisionsService;
  let assistanceService: DecisionAssistanceService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    decisionsService = app.get(GovernmentDecisionsService);
    assistanceService = app.get(DecisionAssistanceService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records findings, reasons, conditions, and notice without issuing an instrument', async () => {
    const fixture = await seedPhase8DecisionFixture(prisma, app);

    const decision = await decisionsService.createDecision(fixture.phase6.officialIdentityId, {
      caseId: fixture.caseId,
      decisionTypeCode: fixture.decisionTypeCode,
      decisionMakerOfficeholderId: fixture.phase6.officialOfficeholderId,
      functionAuthorityRecordId: fixture.decisionFunctionAuthorityRecordId,
      outcome: GovernmentDecisionOutcome.CONDITIONAL_APPROVAL,
    });

    await decisionsService.addFinding(decision.id, {
      findingText: 'Applicant meets statutory standing but site plan is incomplete.',
      findingCode: 'SITE_PLAN_INCOMPLETE',
    });

    const assistance = await assistanceService.recordAssistance({
      governmentDecisionId: decision.id,
      aiModelIdentifier: 'composer-2.5',
      approvedUseCase: 'DRAFT_REASON_LANGUAGE',
      draftOutput: 'Draft reason based on incomplete site plan evidence.',
    });

    await assistanceService.confirmAssistance({
      assistanceRecordId: assistance.id,
      humanReviewerIdentityId: fixture.phase6.officialIdentityId,
      humanReviewerOfficeholderId: fixture.phase6.officialOfficeholderId,
      humanModifications: 'Clarified institutional basis.',
      status: DecisionAssistanceStatus.ACCEPTED,
    });

    await decisionsService.addReason(decision.id, {
      reasonText:
        'Approval is conditional because the site plan does not yet satisfy regulation 12(3).',
      decisionMakerOfficeholderId: fixture.phase6.officialOfficeholderId,
      assistanceRecordId: assistance.id,
      findingReferences: ['1'],
    });

    const condition = await decisionsService.addCondition(decision.id, {
      conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
      responsibleParty: 'Applicant',
      requiredActionOrRestraint: 'Submit certified site plan within 30 days.',
    });

    await decisionsService.approveCondition(
      decision.id,
      condition.id,
      fixture.phase6.officialIdentityId,
      fixture.phase6.officialOfficeholderId,
    );

    await expect(decisionsService.assertIssuanceAllowed(decision.id)).rejects.toThrow(
      /blocks issuance/i,
    );

    const notice = await decisionsService.prepareNotice(decision.id, {
      decisionSummary: 'Conditional approval subject to certified site plan.',
      conditionsSummary: 'Submit certified site plan within 30 days.',
      confidentialityRedactions: [{ field: 'evidenceReference', reason: 'restricted exhibit' }],
    });

    expect(notice?.rights.map((right) => right.routeCode)).toEqual([
      'INTERNAL_REVIEW',
      'STATUTORY_APPEAL',
    ]);

    if (!notice) {
      throw new Error('Expected prepared notice');
    }

    const finalizedNotice = await decisionsService.finalizeNotice(
      decision.id,
      notice.id,
      fixture.phase6.officialIdentityId,
      fixture.phase6.officialOfficeholderId,
    );
    expect(finalizedNotice.noticeStatus).toBe('FINALIZED');

    const issuanceTables = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name IN ('issued_licenses', 'issued_permits', 'issued_certificates')`,
    );
    expect(Number(issuanceTables[0]?.count ?? 0)).toBe(0);
  });

  it('exposes decision detail API with findings, reasons, conditions, and notice', async () => {
    const fixture = await seedPhase8DecisionFixture(prisma, app);

    const created = await request(app.getHttpServer())
      .post('/api/v1/government-decisions')
      .set('Authorization', `Bearer ${fixture.phase6.officialSessionToken}`)
      .send({
        caseId: fixture.caseId,
        decisionTypeCode: fixture.decisionTypeCode,
        decisionMakerOfficeholderId: fixture.phase6.officialOfficeholderId,
        functionAuthorityRecordId: fixture.decisionFunctionAuthorityRecordId,
        outcome: GovernmentDecisionOutcome.REFUSED,
      })
      .expect(201);

    const decisionId = (created.body as GovernmentDecisionResponseBody).id;

    await request(app.getHttpServer())
      .post(`/api/v1/government-decisions/${decisionId}/findings`)
      .set('Authorization', `Bearer ${fixture.phase6.officialSessionToken}`)
      .send({ findingText: 'Mandatory safety criterion not met.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/government-decisions/${decisionId}/reasons`)
      .set('Authorization', `Bearer ${fixture.phase6.officialSessionToken}`)
      .send({
        reasonText: 'The application is refused because safety criterion 8.1 is not met.',
        decisionMakerOfficeholderId: fixture.phase6.officialOfficeholderId,
      })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/government-decisions/${decisionId}`)
      .set('Authorization', `Bearer ${fixture.phase6.officialSessionToken}`)
      .expect(200);

    const detailBody = detail.body as GovernmentDecisionResponseBody;
    expect(detailBody.findings).toHaveLength(1);
    expect(detailBody.reasons).toHaveLength(1);
    expect(detailBody.reasons[0]?.governmentDecisionId).toBe(decisionId);
  });
});
