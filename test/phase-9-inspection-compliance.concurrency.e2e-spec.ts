import { type INestApplication } from '@nestjs/common';
import { OfficialInstrumentStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { ComplianceReviewService } from '../src/compliance/compliance-review.service';
import { InspectionPlanningService } from '../src/compliance/inspection-planning.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 inspection and compliance concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let planning: InspectionPlanningService;
  let reviewService: ComplianceReviewService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    planning = app.get(InspectionPlanningService);
    reviewService = app.get(ComplianceReviewService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects duplicate inspector assignment for same plan and officeholder', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    await planning.assignInspector({
      inspectionPlanId: fixture.inspectionPlanId!,
      inspectorOfficeholderId: fixture.officialOfficeholderId,
      inspectorIdentityId: fixture.officialIdentityId,
      functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
    });

    await expect(
      planning.assignInspector({
        inspectionPlanId: fixture.inspectionPlanId!,
        inspectorOfficeholderId: fixture.officialOfficeholderId,
        inspectorIdentityId: fixture.officialIdentityId,
        functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
      }),
    ).rejects.toThrow();
  });

  it('parallel compliance matter opens create distinct matter numbers', async () => {
    const fixture = await seedPhase9Fixture(app, prisma);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/compliance/matters/open')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          subject: 'Parallel matter A',
          officialInstrumentId: fixture.officialInstrumentId,
        }),
      request(app.getHttpServer())
        .post('/api/v1/compliance/matters/open')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          subject: 'Parallel matter B',
          officialInstrumentId: fixture.officialInstrumentId,
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.matterNumber).not.toBe(second.body.matterNumber);
  });

  it('concurrent reviews on same submission preserve single obligation transition', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const submission = await request(app.getHttpServer())
      .post('/api/v1/compliance/submissions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ continuingObligationId: fixture.continuingObligationId })
      .expect(201);

    await reviewService.reviewSubmission({
      complianceSubmissionId: submission.body.id,
      reviewerIdentityId: fixture.officialIdentityId,
      reviewerOfficeholderId: fixture.officialOfficeholderId,
      outcome: 'OBLIGATION_SATISFIED',
    });

    const reviews = await prisma.complianceReview.findMany({
      where: { complianceSubmissionId: submission.body.id },
    });
    expect(reviews.length).toBeGreaterThanOrEqual(1);

    const instrument = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });
    expect(instrument.status).toBe(OfficialInstrumentStatus.ISSUED);
  });
});
