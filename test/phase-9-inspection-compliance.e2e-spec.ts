import { type INestApplication } from '@nestjs/common';
import {
  ComplianceEscalationLevel,
  ComplianceFindingSeverity,
  ComplianceReviewOutcome,
  CorrectiveActionVerificationOutcome,
  EmergencyInterimActionType,
  EnforcementReferralStatus,
  InspectionAssignmentStatus,
  InspectionType,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { ComplianceReviewService } from '../src/compliance/compliance-review.service';
import { InspectionPlanningService } from '../src/compliance/inspection-planning.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 inspection and compliance (e2e)', () => {
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

  it('E2E 1. opens compliance matter for issued instrument holder', async () => {
    const fixture = await seedPhase9Fixture(app, prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/compliance/matters/open')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        subject: 'Instrument continuing obligations',
        caseId: fixture.caseId,
        officialInstrumentId: fixture.officialInstrumentId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        holderIdentityId: fixture.applicantIdentityId,
      })
      .expect(201);

    expect(response.body.status).toBe('OPEN');
    expect(response.body.holderIdentityId).toBe(fixture.applicantIdentityId);
  });

  it('E2E 2. creates continuing obligation with schedule', async () => {
    const fixture = await seedPhase9Fixture(app, prisma);
    const matter = await request(app.getHttpServer())
      .post('/api/v1/compliance/matters/open')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        subject: 'Reporting obligations',
        officialInstrumentId: fixture.officialInstrumentId,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/compliance/obligations')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: matter.body.id,
        officialInstrumentId: fixture.officialInstrumentId,
        description: 'Annual safety report',
        obligationType: 'REPORTING',
        effectiveFrom: new Date('2026-01-01').toISOString(),
        schedule: {
          frequency: 'ANNUAL',
          nextDueAt: new Date('2027-01-01').toISOString(),
        },
      })
      .expect(201);

    expect(response.body.status).toBe('ACTIVE');
    expect(response.body.schedules).toHaveLength(1);
  });

  it('E2E 3. records submission and institutional review satisfies obligation', async () => {
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
      outcome: ComplianceReviewOutcome.OBLIGATION_SATISFIED,
    });

    const obligation = await prisma.continuingObligation.findUniqueOrThrow({
      where: { id: fixture.continuingObligationId },
    });
    expect(obligation.status).toBe('SATISFIED');
  });

  it('E2E 4. assigns inspector with INSPECT authority and starts session', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    const assignment = await planning.assignInspector({
      inspectionPlanId: fixture.inspectionPlanId!,
      inspectorOfficeholderId: fixture.officialOfficeholderId,
      inspectorIdentityId: fixture.officialIdentityId,
      functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
    });

    expect(assignment.status).toBe(InspectionAssignmentStatus.ASSIGNED);

    const session = await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/sessions/start')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        inspectionPlanId: fixture.inspectionPlanId,
        complianceMatterId: fixture.complianceMatterId,
        caseId: fixture.caseId,
        officialInstrumentId: fixture.officialInstrumentId,
        inspectionTypeDefinitionId: fixture.inspectionTypeDefinitionId,
        functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
        reusePhase7Inspection: {
          caseId: fixture.caseId,
          inspectionType: InspectionType.COMPLIANCE,
          inspectionDate: new Date('2026-05-01').toISOString(),
          scope: 'On-site compliance check',
          inspectorOfficeholderId: fixture.officialOfficeholderId,
          inspectorIdentityId: fixture.officialIdentityId,
        },
      })
      .expect(201);

    expect(session.body.inspectionRecordId).toBeTruthy();
  });

  it('E2E 5. records observation, finding, corrective action, and authorized closure', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    const session = await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/sessions/start')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: fixture.complianceMatterId,
        caseId: fixture.caseId,
        officialInstrumentId: fixture.officialInstrumentId,
      })
      .expect(201);

    const observation = await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/observations')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        inspectionSessionId: session.body.id,
        description: 'Missing signage at entry',
        observerIdentityId: fixture.officialIdentityId,
        observerOfficeholderId: fixture.officialOfficeholderId,
      })
      .expect(201);

    expect(observation.body.classification).toBe('OBSERVATION');

    const finding = await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/findings')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        inspectionSessionId: session.body.id,
        inspectionObservationId: observation.body.id,
        severity: ComplianceFindingSeverity.MINOR,
        findingCode: 'SIGN-001',
        description: 'Required signage not displayed',
        determinedByIdentityId: fixture.officialIdentityId,
        determinedByOfficeholderId: fixture.officialOfficeholderId,
        complianceMatterId: fixture.complianceMatterId,
      })
      .expect(201);

    const plan = await request(app.getHttpServer())
      .post('/api/v1/compliance/corrective-action/plans')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: fixture.complianceMatterId,
        inspectionFindingId: finding.body.id,
        items: [
          {
            description: 'Install compliant signage',
            assignedToIdentityId: fixture.applicantIdentityId,
          },
        ],
      })
      .expect(201);

    const itemId = plan.body.items[0].id as string;
    await prisma.correctiveActionItem.update({
      where: { id: itemId },
      data: { status: 'COMPLETED' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/compliance/corrective-action/verify')
      .set('Authorization', `Bearer ${fixture.approverSessionToken}`)
      .send({
        correctiveActionItemId: itemId,
        verifierIdentityId: fixture.approverIdentityId,
        verifierOfficeholderId: fixture.approverOfficeholderId,
        outcome: CorrectiveActionVerificationOutcome.VERIFIED_SATISFACTORY,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/findings/close')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        inspectionFindingId: finding.body.id,
        closedByIdentityId: fixture.officialIdentityId,
        closedByOfficeholderId: fixture.officialOfficeholderId,
        closureReason: 'Corrective action verified',
      })
      .expect(201);
  });

  it('E2E 6. escalates and refers enforcement without changing instrument status', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const beforeStatus = (
      await prisma.officialInstrument.findUniqueOrThrow({
        where: { id: fixture.officialInstrumentId },
      })
    ).status;

    const escalation = await request(app.getHttpServer())
      .post('/api/v1/compliance/escalations')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: fixture.complianceMatterId,
        level: ComplianceEscalationLevel.MANAGEMENT,
        escalatedByIdentityId: fixture.officialIdentityId,
        escalatedByOfficeholderId: fixture.officialOfficeholderId,
        reason: 'Repeated reporting failures',
      })
      .expect(201);

    const referral = await request(app.getHttpServer())
      .post('/api/v1/compliance/enforcement/referrals')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceEscalationId: escalation.body.id,
        referredByIdentityId: fixture.officialIdentityId,
        referredByOfficeholderId: fixture.officialOfficeholderId,
        targetAuthorityReference: 'ENF-UNIT-001',
      })
      .expect(201);

    expect(referral.body.status).toBe(EnforcementReferralStatus.PREPARED);

    await request(app.getHttpServer())
      .post('/api/v1/compliance/emergency/interim-actions')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        complianceMatterId: fixture.complianceMatterId,
        officialInstrumentId: fixture.officialInstrumentId,
        actionType: EmergencyInterimActionType.SAFETY_HOLD,
        recordedByIdentityId: fixture.officialIdentityId,
        recordedByOfficeholderId: fixture.officialOfficeholderId,
        reason: 'Immediate site safety concern',
      })
      .expect(201);

    const afterStatus = (
      await prisma.officialInstrument.findUniqueOrThrow({
        where: { id: fixture.officialInstrumentId },
      })
    ).status;
    expect(afterStatus).toBe(beforeStatus);
    expect(beforeStatus).toBe(OfficialInstrumentStatus.ISSUED);
  });
});
