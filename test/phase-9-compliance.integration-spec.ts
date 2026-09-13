import { type INestApplication } from '@nestjs/common';
import {
  ComplianceAssessmentOutcome,
  ComplianceFindingSeverity,
  ComplianceProjectionStatus,
  ComplianceReviewOutcome,
  ContinuingObligationStatus,
  InspectionType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { ComplianceBoundaryService } from '../src/compliance/compliance-boundary.service';
import { ComplianceReviewService } from '../src/compliance/compliance-review.service';
import { InspectionExecutionService } from '../src/compliance/inspection-execution.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 compliance (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;
  let reviewService: ComplianceReviewService;
  let executionService: InspectionExecutionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
    reviewService = app.get(ComplianceReviewService);
    executionService = app.get(InspectionExecutionService);
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
      .post('/api/v1/compliance/matters/open')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        subject: 'Post-issuance compliance monitoring',
        caseId: fixture.caseId,
        officialInstrumentId: fixture.officialInstrumentId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        holderIdentityId: fixture.applicantIdentityId,
      })
      .expect(201);

    expect(response.body.matterNumber).toMatch(/^CM-/);
    expect(response.body.officialInstrumentId).toBe(fixture.officialInstrumentId);
  });

  it('records submission without satisfying obligation until institutional review', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    const submission = await request(app.getHttpServer())
      .post('/api/v1/compliance/submissions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ continuingObligationId: fixture.continuingObligationId })
      .expect(201);

    const obligationBefore = await prisma.continuingObligation.findUniqueOrThrow({
      where: { id: fixture.continuingObligationId },
    });
    expect(obligationBefore.status).toBe(ContinuingObligationStatus.ACTIVE);

    await reviewService.reviewSubmission({
      complianceSubmissionId: submission.body.id,
      reviewerIdentityId: fixture.officialIdentityId,
      reviewerOfficeholderId: fixture.officialOfficeholderId,
      outcome: ComplianceReviewOutcome.OBLIGATION_SATISFIED,
      notes: 'Report accepted after review',
    });

    const obligationAfter = await prisma.continuingObligation.findUniqueOrThrow({
      where: { id: fixture.continuingObligationId },
    });
    expect(obligationAfter.status).toBe(ContinuingObligationStatus.SATISFIED);
  });

  it('starts inspection session reusing Phase 7 inspection record', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    const session = await executionService.startSession({
      inspectionPlanId: fixture.inspectionPlanId,
      complianceMatterId: fixture.complianceMatterId,
      caseId: fixture.caseId,
      officialInstrumentId: fixture.officialInstrumentId,
      inspectionTypeDefinitionId: fixture.inspectionTypeDefinitionId,
      functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
      reusePhase7Inspection: {
        caseId: fixture.caseId,
        inspectionType: InspectionType.COMPLIANCE,
        inspectionDate: new Date('2026-05-01'),
        scope: 'Site compliance verification',
        inspectorOfficeholderId: fixture.officialOfficeholderId,
        inspectorIdentityId: fixture.officialIdentityId,
      },
    });

    expect(session.inspectionRecordId).toBeTruthy();
    expect(session.inspectionRecord?.status).toBe('SCHEDULED');
  });

  it('records informational compliance projection without mutating instrument status', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const before = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });

    await request(app.getHttpServer())
      .post('/api/v1/compliance/projections')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: fixture.complianceMatterId,
        officialInstrumentId: fixture.officialInstrumentId,
        projectedStatus: ComplianceProjectionStatus.AT_RISK,
        basisSummary: 'Quarterly report overdue',
      })
      .expect(201);

    const after = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });
    expect(after.status).toBe(before.status);

    await prisma.complianceAssessment.create({
      data: {
        complianceMatterId: fixture.complianceMatterId!,
        assessorIdentityId: fixture.officialIdentityId,
        assessorOfficeholderId: fixture.officialOfficeholderId,
        outcome: ComplianceAssessmentOutcome.PARTIALLY_COMPLIANT,
        summary: 'Reporting delayed but not yet noncompliant',
      },
    });

    expect(boundary).toBeDefined();
    expect(ComplianceFindingSeverity.MAJOR).toBe('MAJOR');
  });
});
