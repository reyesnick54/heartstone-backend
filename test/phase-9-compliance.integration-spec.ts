import { type INestApplication } from '@nestjs/common';
import { ContinuingObligationStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { ComplianceBoundaryService } from '../src/compliance/common/compliance-boundary.service';
import { ComplianceSubmissionService } from '../src/compliance/submissions/compliance-submission.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 compliance (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;
  let submissionService: ComplianceSubmissionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
    submissionService = app.get(ComplianceSubmissionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens compliance matter linked to issued instrument and master file', async () => {
    const fixture = await seedPhase9Fixture(app, prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/compliance/matters')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        officialInstrumentId: fixture.officialInstrumentId,
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        caseId: fixture.caseId,
        holderIdentityId: fixture.applicantIdentityId,
      })
      .expect(201);

    const body = response.body as {
      complianceMatterNumber: string;
      officialInstrumentId: string;
    };
    expect(body.complianceMatterNumber).toMatch(/^CM-/);
    expect(body.officialInstrumentId).toBe(fixture.officialInstrumentId);
  });

  it('records submission without automatically satisfying obligation', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    if (!fixture.continuingObligationId || !fixture.complianceMatterId) {
      throw new Error('Compliance graph fixture is required for submission test');
    }

    const result = await submissionService.receiveSubmission(fixture.applicantIdentityId, {
      continuingObligationId: fixture.continuingObligationId,
      complianceMatterId: fixture.complianceMatterId,
      reportingPeriodStart: '2026-01-01',
      reportingPeriodEnd: '2026-03-31',
      answersData: { quarterlyReport: 'attached' },
    });

    const obligation = await prisma.continuingObligation.findUniqueOrThrow({
      where: { id: fixture.continuingObligationId },
    });
    expect(obligation.status).toBe(ContinuingObligationStatus.SUBMITTED);
    expect(obligation.status).not.toBe(ContinuingObligationStatus.SATISFIED);
    expect(result.submission?.id).toEqual(expect.any(String));
    expect(boundary).toBeDefined();
  });
});
