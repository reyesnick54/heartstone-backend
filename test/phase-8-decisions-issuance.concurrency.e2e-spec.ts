import { type INestApplication } from '@nestjs/common';
import { OfficialInstrumentStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { IssuanceService } from '../src/decisions-issuance/issuance/issuance.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  assessDecisionReadiness,
  executeGovernmentDecision,
  issueInstrumentForDecision,
  requirePreRecordedDecision,
  seedPhase8Fixture,
} from './helpers/phase-8-test-fixtures';

describe('Phase 8 decisions and issuance concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let issuanceService: IssuanceService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    issuanceService = app.get(IssuanceService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects duplicate decision execution against the same readiness assessment', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const readiness = await assessDecisionReadiness(app, fixture);

    await executeGovernmentDecision(app, fixture, 'APPROVED', {
      readinessAssessmentId: readiness.assessmentId,
    });

    await expect(
      executeGovernmentDecision(app, fixture, 'APPROVED', {
        readinessAssessmentId: readiness.assessmentId,
      }),
    ).rejects.toThrow();
  });

  it('rejects conflicting issuer without ISSUE authority on issuance endpoint', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.issueFunctionAuthorityRecordId, action: 'ISSUE' },
      data: { permitted: false },
    });

    await request(app.getHttpServer())
      .post('/api/v1/decisions-issuance/issue')
      .set('Authorization', `Bearer ${fixture.approverSessionToken}`)
      .send({
        governmentDecisionId: fixture.governmentDecisionId,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerOfficeholderId: fixture.approverOfficeholderId,
        issuerOfficeId: fixture.officeId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01').toISOString(),
        sealDocumentVersionId: fixture.sealDocumentVersionId,
      })
      .expect(403);
  });

  it('rejects duplicate issuance with the same idempotency key only once', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const key = 'phase-8-concurrency-idempotent';

    const first = await issuanceService.issue({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
      idempotencyKey: key,
    });

    const second = await issuanceService.issue({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
      idempotencyKey: key,
    });

    expect(second.instrument.id).toBe(first.instrument.id);
    expect(second.instrument.instrumentNumber).toBe(first.instrument.instrumentNumber);
  });

  it('allocates unique instrument numbers under concurrent issuance attempts', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    const firstDecision = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });

    const secondReadiness = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: `${fixture.marker}-DRA-002`,
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'READY',
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
      },
    });

    const secondDecision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: `${fixture.marker}-DEC-000002`,
        caseId: fixture.caseId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        functionAuthorityRecordId: firstDecision.functionAuthorityRecordId,
        authorityEvaluationRecordId: firstDecision.authorityEvaluationRecordId,
        decisionReadinessAssessmentId: secondReadiness.id,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        institutionId: fixture.institutionId,
        departmentId: firstDecision.departmentId,
        matterDecided: 'Second approval on same case',
        outcome: 'APPROVED',
        decisionStatus: 'RECORDED',
        decidedAt: new Date(),
        integrityHash: 'second-decision-hash',
      },
    });

    const [first, second] = await Promise.all([
      issuanceService.issue({
        governmentDecisionId: requirePreRecordedDecision(fixture),
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        issuerAppointmentId: fixture.appointmentId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01'),
        sealDocumentVersionId: fixture.sealDocumentVersionId,
        idempotencyKey: 'concurrency-number-1',
      }),
      issuanceService.issue({
        governmentDecisionId: secondDecision.id,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        issuerAppointmentId: fixture.appointmentId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01'),
        sealDocumentVersionId: fixture.sealDocumentVersionId,
        idempotencyKey: 'concurrency-number-2',
      }),
    ]);

    expect(first.instrument.instrumentNumber).not.toBe(second.instrument.instrumentNumber);
  });

  it('blocks issuance when precedent conditions are suspended during issuance attempt', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    await prisma.decisionCondition.updateMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
      data: { status: 'PENDING' },
    });

    await expect(
      issueInstrumentForDecision(app, fixture, requirePreRecordedDecision(fixture), {
        sealDocumentVersionId: fixture.sealDocumentVersionId,
      }),
    ).rejects.toThrow();
  });

  it('does not leave case ISSUED when concurrent issuance fails readiness', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const before = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });

    await prisma.decisionCondition.updateMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
      data: { status: 'PENDING' },
    });

    try {
      await issuanceService.issue({
        governmentDecisionId: requirePreRecordedDecision(fixture),
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        issuerAppointmentId: fixture.appointmentId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01'),
        sealDocumentVersionId: fixture.sealDocumentVersionId,
      });
    } catch {
      // expected failure
    }

    const after = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(after.status).toBe(before.status);

    const instruments = await prisma.officialInstrument.findMany({
      where: { caseId: fixture.caseId, status: OfficialInstrumentStatus.ISSUED },
    });
    expect(instruments).toHaveLength(0);
  });
});
