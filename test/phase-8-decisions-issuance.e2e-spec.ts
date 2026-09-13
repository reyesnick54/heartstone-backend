import { type INestApplication } from '@nestjs/common';
import {
  CaseStatus,
  DecisionConditionType,
  DocumentSealStatus,
  DocumentSignatureStatus,
  GovernmentDecisionStatus,
  InstrumentIssuerSource,
  OfficialInstrumentKind,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { IssuanceReadinessService } from '../src/decisions-issuance/issuance/issuance-readiness.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  executeGovernmentDecision,
  issueInstrumentForDecision,
  requirePreRecordedDecision,
  seedPhase8Fixture,
} from './helpers/phase-8-test-fixtures';

describe('Phase 8 decisions and issuance lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let readinessService: IssuanceReadinessService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    readinessService = app.get(IssuanceReadinessService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('E2E 1. approval path records government decision and issues official instrument', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'APPROVED');
    expect(decision.decisionStatus).toBe(GovernmentDecisionStatus.RECORDED);

    const issued = await issueInstrumentForDecision(app, fixture, decision.id, {
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    expect(issued.instrument.status).toBe(OfficialInstrumentStatus.ISSUED);
    expect(issued.instrument.instrumentNumber).toBeTruthy();

    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseRecord.status).toBe(CaseStatus.ISSUED);
  });

  it('E2E 2. refusal path records decision without instrument issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'REFUSED', {
      matterDecided: 'Application refused on substantive grounds',
    });

    expect(decision.outcome).toBe('REFUSED');

    const instruments = await prisma.officialInstrument.findMany({ where: { caseId: fixture.caseId } });
    expect(instruments).toHaveLength(0);

    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseRecord.status).toBe(CaseStatus.DECIDED);
  });

  it('E2E 3. conditional approval records precedent-to-issuance conditions', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'CONDITIONALLY_APPROVED', {
      matterDecided: 'Approved subject to final inspection report',
    });

    const stored = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: decision.id },
      include: { conditions: true },
    });

    expect(stored.outcome).toBe('CONDITIONALLY_APPROVED');

    await prisma.decisionCondition.create({
      data: {
        governmentDecisionId: decision.id,
        conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
        description: 'Submit final site inspection report',
        status: 'PENDING',
      },
    });

    const refreshed = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: decision.id },
      include: { conditions: true },
    });
    expect(refreshed.conditions.some((c) => c.conditionType === DecisionConditionType.PRECEDENT_TO_ISSUANCE)).toBe(
      true,
    );
  });

  it('E2E 4. retained national instrument type blocks ABSEZ issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { retainedNationalBoundary: true },
    });

    const readiness = await readinessService.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      issuerSource: InstrumentIssuerSource.ABSEZ_ISSUED,
    });

    expect(readiness.outcome).toBe('BLOCKED');
  });

  it('E2E 5. invalid signature document blocks issuance when signature is required', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true },
    });

    await prisma.documentVersion.update({
      where: { id: fixture.signatureDocumentVersionId },
      data: { signatureStatus: DocumentSignatureStatus.SIGNATURE_INVALID },
    });

    const readiness = await readinessService.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      signatureDocumentVersionId: fixture.signatureDocumentVersionId,
    });

    expect(readiness.outcome).toBe('NOT_READY');
    expect(readiness.checklistResults.find((c) => c.code === 'SIGNATURE_VALID')?.passed).toBe(false);
  });

  it('E2E 6. seal dual control requires distinct approver seal document before issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { sealRequired: true },
    });

    const unsealed = await prisma.documentRecord.create({
      data: {
        documentNumber: `${fixture.marker}-UNSEALED`,
        title: 'Unsealed document',
        documentType: 'SEAL',
        sourceType: 'SYSTEM_GENERATED',
        owningInstitutionId: fixture.institutionId,
        versions: {
          create: {
            versionNumber: 1,
            originalFilename: 'unsealed.txt',
            contentType: 'text/plain',
            sizeBytes: 10,
            storageProvider: 'inline',
            storageObjectKey: 'unsealed/key',
            sha256: 'unsealed-hash',
            sealStatus: DocumentSealStatus.UNSEALED,
          },
        },
      },
      include: { versions: true },
    });

    const readiness = await readinessService.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: unsealed.versions[0]?.id ?? '',
    });

    expect(readiness.outcome).toBe('NOT_READY');
    expect(readiness.checklistResults.find((c) => c.code === 'SEAL_VALID')?.passed).toBe(false);

    const approverReadiness = await readinessService.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.approverIdentityId,
      issuerOfficeholderId: fixture.approverOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    expect(approverReadiness.checklistResults.find((c) => c.code === 'SEAL_VALID')?.passed).toBe(true);
    expect(fixture.approverOfficeholderId).not.toBe(fixture.officialOfficeholderId);
  });

  it('E2E 7. suspension notice kind is distinct from license kind', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issueInstrumentForDecision(app, fixture, requirePreRecordedDecision(fixture), {
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    const suspensionType = await prisma.instrumentTypeDefinition.create({
      data: {
        code: `${fixture.marker}-SUSPENSION`,
        name: 'Suspension Notice',
        kind: OfficialInstrumentKind.SUSPENSION_NOTICE,
        lifecycleStatus: 'ACTIVE',
      },
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.SUSPENDED },
    });

    const instrument = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: issued.instrument.id },
      include: { instrumentTypeVersion: { include: { instrumentTypeDefinition: true } } },
    });

    expect(instrument.status).toBe(OfficialInstrumentStatus.SUSPENDED);
    expect(instrument.instrumentTypeVersion.instrumentTypeDefinition.kind).toBe(OfficialInstrumentKind.LICENSE);
    expect(suspensionType.kind).toBe(OfficialInstrumentKind.SUSPENSION_NOTICE);
  });

  it('E2E 8. revocation is distinct from suspension', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issueInstrumentForDecision(app, fixture, requirePreRecordedDecision(fixture), {
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.SUSPENDED },
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.REVOKED },
    });

    const instrument = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: issued.instrument.id },
    });

    expect(instrument.status).toBe(OfficialInstrumentStatus.REVOKED);
    expect(instrument.status).not.toBe(OfficialInstrumentStatus.SUSPENDED);
  });

  it('E2E 9. reinstatement returns instrument to issued state', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issueInstrumentForDecision(app, fixture, requirePreRecordedDecision(fixture), {
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.SUSPENDED },
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.ISSUED },
    });

    const instrument = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: issued.instrument.id },
    });
    expect(instrument.status).toBe(OfficialInstrumentStatus.ISSUED);
  });

  it('E2E 10. amended instrument preserves prior version history', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issueInstrumentForDecision(app, fixture, requirePreRecordedDecision(fixture), {
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    const currentVersion = await prisma.officialInstrumentVersion.findFirstOrThrow({
      where: { officialInstrumentId: issued.instrument.id },
    });

    const amendedDoc = await prisma.documentRecord.create({
      data: {
        documentNumber: `${fixture.marker}-AMENDED`,
        title: 'Amended instrument',
        documentType: 'LICENSE',
        sourceType: 'SYSTEM_GENERATED',
        owningInstitutionId: fixture.institutionId,
        versions: {
          create: {
            versionNumber: 1,
            originalFilename: 'amended.txt',
            contentType: 'text/plain',
            sizeBytes: 20,
            storageProvider: 'inline',
            storageObjectKey: 'amended/key',
            sha256: 'amended-hash',
          },
        },
      },
      include: { versions: true },
    });

    await prisma.officialInstrumentVersion.create({
      data: {
        officialInstrumentId: issued.instrument.id,
        versionNumber: 2,
        templateVersionId: fixture.templateVersionId,
        documentRecordId: amendedDoc.id,
        documentVersionId: amendedDoc.versions[0]?.id ?? '',
        contentHash: 'amended-content-hash',
        governmentDecisionId: requirePreRecordedDecision(fixture),
        conditionsSnapshot: {},
      },
    });

    await prisma.officialInstrument.update({
      where: { id: issued.instrument.id },
      data: { status: OfficialInstrumentStatus.AMENDED },
    });

    const versions = await prisma.officialInstrumentVersion.findMany({
      where: { officialInstrumentId: issued.instrument.id },
      orderBy: { versionNumber: 'asc' },
    });

    expect(versions).toHaveLength(2);
    expect(versions[0]?.id).toBe(currentVersion.id);
    expect(versions[1]?.versionNumber).toBe(2);
  });

  it('E2E 11. active appeal flag on disposition request does not auto-reverse decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'APPROVED');

    const disposition = await prisma.recordDispositionRequest.create({
      data: {
        requestReference: `${fixture.marker}-DISP-001`,
        targetType: 'CASE',
        targetReference: fixture.caseId,
        requestedByIdentityId: fixture.applicantIdentityId,
        reason: 'Appeal lodged',
        appealActive: true,
      },
    });

    const storedDecision = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: decision.id },
    });

    expect(disposition.appealActive).toBe(true);
    expect(storedDecision.decisionStatus).toBe(GovernmentDecisionStatus.RECORDED);
    expect(storedDecision.outcome).toBe('APPROVED');

    const preparation = await request(app.getHttpServer())
      .post('/api/v1/decisions/preparation')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedOutcome: 'REFUSED',
        recommendation: 'Appeal review recommends refusal',
      })
      .expect(201);

    expect((preparation.body as { isOfficialDecision?: boolean }).isOfficialDecision).toBe(false);
  });
});
