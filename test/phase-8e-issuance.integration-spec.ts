import { type INestApplication } from '@nestjs/common';
import { CaseStatus, OfficialInstrumentStatus } from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { IssuanceNotReadyException } from '../src/decisions-issuance/common/exceptions/issuance.exceptions';
import { IssuanceService } from '../src/decisions-issuance/issuance/issuance.service';
import { IssuanceReadinessService } from '../src/decisions-issuance/issuance/issuance-readiness.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  seedPhase8eIssuanceFixture,
  seedSignedSealedDocuments,
} from './helpers/phase-8e-test-fixtures';

describe('Phase 8E official instrument issuance (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let issuanceService: IssuanceService;
  let readinessService: IssuanceReadinessService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    issuanceService = app.get(IssuanceService);
    readinessService = app.get(IssuanceReadinessService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('decision alone does not equal issued instrument', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    const instruments = await prisma.officialInstrument.findMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
    });

    expect(instruments).toHaveLength(0);

    const caseRecord = await prisma.case.findUnique({ where: { id: fixture.caseId } });
    expect(caseRecord?.status).not.toBe(CaseStatus.ISSUED);
  });

  it('issues official instrument after readiness passes and transitions case to ISSUED', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    const result = await issuanceService.issue({
      governmentDecisionId: fixture.governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      freeFormFields: { holderName: 'Test Holder Ltd' },
      idempotencyKey: 'phase-8e-success-1',
    });

    expect(result.instrument.status).toBe(OfficialInstrumentStatus.ISSUED);
    expect(result.instrument.instrumentNumber).toBeTruthy();
    expect(result.issuanceEvent.status).toBe('COMPLETED');

    const caseRecord = await prisma.case.findUnique({ where: { id: fixture.caseId } });
    expect(caseRecord?.status).toBe(CaseStatus.ISSUED);

    const version = await prisma.officialInstrumentVersion.findUnique({
      where: { id: result.instrumentVersion.id },
    });
    expect(version?.templateVersionId).toBe(fixture.templateVersionId);
  });

  it('refusal decision cannot issue approval instrument', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await prisma.governmentDecision.update({
      where: { id: fixture.governmentDecisionId },
      data: { outcome: 'REFUSED', matterDecided: 'Application refused' },
    });

    await expect(
      readinessService.assess({
        governmentDecisionId: fixture.governmentDecisionId,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).resolves.toMatchObject({ outcome: 'NOT_READY' });
  });

  it('missing precedent condition blocks issuance', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await prisma.decisionCondition.updateMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
      data: { status: 'PENDING' },
    });

    await expect(
      issuanceService.issue({
        governmentDecisionId: fixture.governmentDecisionId,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        issuerAppointmentId: fixture.appointmentId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'Import/export' },
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(IssuanceNotReadyException);
  });

  it('client cannot select instrument number', () => {
    expect(() => {
      issuanceService.rejectClientIssuanceFields({ instrumentNumber: 'CLIENT-PICKED-001' });
    }).toThrow('Client may not set "instrumentNumber"');
  });

  it('duplicate instrument numbers are impossible for the same numbering rule', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await issuanceService.issue({
      governmentDecisionId: fixture.governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      idempotencyKey: 'phase-8e-dup-1',
    });

    const firstDecision = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });

    const secondDecision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: 'NON_PRODUCTION_DECISIONS_ISSUANCE_TEST_ONLY-DEC-000002',
        caseId: fixture.caseId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        functionAuthorityRecordId: firstDecision.functionAuthorityRecordId,
        authorityEvaluationRecordId: firstDecision.authorityEvaluationRecordId,
        decisionReadinessAssessmentId: firstDecision.decisionReadinessAssessmentId,
        evidencePacketVersionId: firstDecision.evidencePacketVersionId,
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

    const second = await issuanceService.issue({
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
      idempotencyKey: 'phase-8e-dup-2',
    });

    const first = await prisma.officialInstrument.findFirst({
      where: { governmentDecisionId: fixture.governmentDecisionId },
    });

    expect(first?.instrumentNumber).not.toBe(second.instrument.instrumentNumber);
  });

  it('blocks issuance when signature and seal are required but invalid', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);
    const docs = await seedSignedSealedDocuments(prisma, fixture.institutionId);

    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true, sealRequired: true },
    });

    await prisma.documentVersion.update({
      where: { id: docs.signatureDocumentVersionId },
      data: { signatureStatus: 'SIGNATURE_INVALID' },
    });

    const readiness = await readinessService.assess({
      governmentDecisionId: fixture.governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      signatureDocumentVersionId: docs.signatureDocumentVersionId,
      sealDocumentVersionId: docs.sealDocumentVersionId,
    });

    expect(readiness.outcome).toBe('NOT_READY');
    expect(readiness.checklistResults.find((c) => c.code === 'SIGNATURE_VALID')?.passed).toBe(
      false,
    );
  });

  it('retained-national instrument cannot be issued as ABSEZ instrument', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { retainedNationalBoundary: true },
    });

    const readiness = await readinessService.assess({
      governmentDecisionId: fixture.governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      issuerSource: 'ABSEZ_ISSUED',
    });

    expect(readiness.outcome).toBe('BLOCKED');
  });
});
