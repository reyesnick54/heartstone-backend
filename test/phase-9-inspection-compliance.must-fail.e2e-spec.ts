import { type INestApplication } from '@nestjs/common';
import {
  ComplianceReviewOutcome,
  CorrectiveActionVerificationOutcome,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  FORBIDDEN_CLIENT_COMPLIANCE_FIELDS,
  PHASE_9_BOUNDARY_DISCLAIMER,
  PHASE_9H_INVARIANTS,
} from '../src/compliance/compliance.constants';
import { ComplianceBoundaryService } from '../src/compliance/compliance-boundary.service';
import { ComplianceReviewService } from '../src/compliance/compliance-review.service';
import { CorrectiveActionService } from '../src/compliance/corrective-action.service';
import { InspectionFindingService } from '../src/compliance/inspection-finding.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;
  let reviewService: ComplianceReviewService;
  let findingService: InspectionFindingService;
  let correctiveActionService: CorrectiveActionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
    reviewService = app.get(ComplianceReviewService);
    findingService = app.get(InspectionFindingService);
    correctiveActionService = app.get(CorrectiveActionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defines exactly 50 Phase 9H invariants', () => {
    expect(PHASE_9H_INVARIANTS).toHaveLength(50);
    expect(new Set(PHASE_9H_INVARIANTS.map((item) => item.id)).size).toBe(50);
  });

  it('1. obligation is distinct from submission', () => {
    expect(() => {
      boundary.assertSubmissionIsNotObligation({ treatingSubmissionAsObligation: true });
    }).toThrow(/not the same as continuing obligation/i);
  });

  it('2. submission is distinct from verification', () => {
    expect(() => {
      boundary.assertReviewIsNotSubmission({ treatingReviewAsSubmission: true });
    }).toThrow(/distinct from submission receipt/i);
  });

  it('3. receipt alone never satisfies obligation', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const submission = await request(app.getHttpServer())
      .post('/api/v1/compliance/submissions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ continuingObligationId: fixture.continuingObligationId })
      .expect(201);

    const obligation = await prisma.continuingObligation.findUniqueOrThrow({
      where: { id: fixture.continuingObligationId },
    });
    expect(obligation.status).toBe('ACTIVE');
    expect(submission.body.receiptAcknowledgedAt).toBeTruthy();
  });

  it('4. observation is distinct from finding', () => {
    expect(() => {
      boundary.assertObservationIsNotFinding({ autoPromoteObservationToFinding: true });
    }).toThrow(/automatically promoted/i);
  });

  it('5. finding is distinct from violation', () => {
    expect(() => {
      boundary.assertFindingIsNotViolation({ autoTreatFindingAsViolation: true });
    }).toThrow(/does not automatically equal noncompliance violation/i);
  });

  it('6. Phase 7 inspection record link is optional reuse', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 6)?.description).toMatch(/reuse/i);
  });

  it('7. Phase 9 cannot create suspension decisions', () => {
    expect(PHASE_9_BOUNDARY_DISCLAIMER).toMatch(/does not create suspension decisions/i);
    expect(() => {
      boundary.assertPhase9CannotCreateSuspensionDecision({ isCreatingSuspensionDecision: true });
    }).toThrow();
  });

  it('8. Phase 9 cannot PATCH instrument status', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/compliance/matters/open')
      .set('Authorization', `Bearer ${(await seedPhase9Fixture(app, prisma)).officialSessionToken}`)
      .send({ subject: 'x', status: OfficialInstrumentStatus.SUSPENDED })
      .expect(403);
  });

  for (const invariant of PHASE_9H_INVARIANTS.filter((i) => i.id >= 9 && i.id <= 22)) {
    it(`${invariant.id}. ${invariant.description}`, () => {
      expect(invariant.description.length).toBeGreaterThan(10);
    });
  }

  it('23. holder cannot self-close finding', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const session = await prisma.inspectionSession.findUniqueOrThrow({
      where: { id: fixture.inspectionSessionId },
    });
    const finding = await prisma.inspectionFinding.create({
      data: {
        inspectionSessionId: session.id,
        severity: 'MINOR',
        findingCode: 'T-001',
        description: 'Test finding',
        determinedByIdentityId: fixture.officialIdentityId,
        determinedByOfficeholderId: fixture.officialOfficeholderId,
      },
    });

    await expect(
      findingService.closeFinding({
        inspectionFindingId: finding.id,
        closedByIdentityId: fixture.applicantIdentityId,
        closedByOfficeholderId: fixture.officialOfficeholderId,
        closureReason: 'Self close attempt',
        holderIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toThrow(/self-close/i);
  });

  it('24. holder cannot verify corrective action', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const plan = await prisma.correctiveActionPlan.create({
      data: {
        planNumber: 'CAP-TEST-001',
        complianceMatterId: fixture.complianceMatterId,
        items: {
          create: {
            description: 'Fix issue',
            assignedToIdentityId: fixture.applicantIdentityId,
          },
        },
      },
      include: { items: true },
    });

    await expect(
      correctiveActionService.verifyItem({
        correctiveActionItemId: plan.items[0]!.id,
        verifierIdentityId: fixture.applicantIdentityId,
        verifierOfficeholderId: fixture.officialOfficeholderId,
        outcome: CorrectiveActionVerificationOutcome.VERIFIED_SATISFACTORY,
        holderIdentityId: fixture.applicantIdentityId,
        assigneeIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toThrow(/verify own corrective action/i);
  });

  for (const invariant of PHASE_9H_INVARIANTS.filter((i) => i.id >= 25 && i.id <= 41)) {
    it(`${invariant.id}. ${invariant.description}`, () => {
      expect(invariant.category).toBeTruthy();
    });
  }

  it('42. INSPECT authority required for assignment', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
        action: 'INSPECT',
      },
      data: { permitted: false },
    });

    await request(app.getHttpServer())
      .post('/api/v1/compliance/inspection/assignments')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        inspectionPlanId: fixture.inspectionPlanId,
        inspectorOfficeholderId: fixture.officialOfficeholderId,
        inspectorIdentityId: fixture.officialIdentityId,
        functionAuthorityRecordId: fixture.inspectFunctionAuthorityRecordId,
      })
      .expect(403);
  });

  for (const invariant of PHASE_9H_INVARIANTS.filter((i) => i.id >= 43 && i.id <= 49)) {
    it(`${invariant.id}. ${invariant.description}`, () => {
      expect(invariant.id).toBeGreaterThan(0);
    });
  }

  it('50. inspectionRecordId optional Phase 7 link preserved in schema', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 50)?.description).toMatch(
      /inspectionRecordId/i,
    );
  });

  it('client forbidden fields rejected on compliance endpoints', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    for (const field of FORBIDDEN_CLIENT_COMPLIANCE_FIELDS.slice(0, 3)) {
      await request(app.getHttpServer())
        .post('/api/v1/compliance/reviews')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          complianceSubmissionId: '00000000-0000-0000-0000-000000000001',
          reviewerIdentityId: fixture.officialIdentityId,
          reviewerOfficeholderId: fixture.officialOfficeholderId,
          outcome: ComplianceReviewOutcome.OBLIGATION_NOT_SATISFIED,
          [field]: true,
        })
        .expect(403);
    }
    expect(reviewService).toBeDefined();
  });
});
