import { type INestApplication } from '@nestjs/common';
import { OfficialInstrumentKind } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER } from '../src/decisions-issuance/decisions-issuance.constants';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase8eIssuanceFixture } from './helpers/phase-8e-test-fixtures';

describe('Phase 8E issuance must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. generated document alone is not an official instrument', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    const doc = await prisma.documentRecord.create({
      data: {
        documentNumber: 'FAKE-LICENSE-001',
        title: 'License',
        documentType: 'LICENSE',
        sourceType: 'SYSTEM_GENERATED',
        owningInstitutionId: fixture.institutionId,
        versions: {
          create: {
            versionNumber: 1,
            originalFilename: 'license.pdf',
            contentType: 'application/pdf',
            sizeBytes: 100,
            storageProvider: 'inline',
            storageObjectKey: 'fake/key',
            sha256: 'fakehash',
          },
        },
      },
    });

    const instrument = await prisma.officialInstrument.findFirst({
      where: { caseId: fixture.caseId },
    });

    expect(instrument).toBeNull();
    expect(doc.title).toBe('License');
  });

  it('2. acknowledgment kind cannot masquerade as license based on title alone', async () => {
    await seedPhase8eIssuanceFixture(prisma);

    const ackType = await prisma.instrumentTypeDefinition.findFirst({
      where: { kind: OfficialInstrumentKind.ACKNOWLEDGMENT },
    });

    expect(ackType).toBeNull();

    const licenseType = await prisma.instrumentTypeDefinition.findFirst({
      where: { code: `${NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER}-LICENSE` },
    });

    expect(licenseType?.kind).toBe(OfficialInstrumentKind.LICENSE);
  });

  it('3. issuance endpoint rejects unauthenticated requests', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/decisions-issuance/issue')
      .send({
        governmentDecisionId: fixture.governmentDecisionId,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'test' },
        effectiveFrom: new Date().toISOString(),
      })
      .expect(401);
  });

  it('4. failed issuance leaves no false ISSUED case status', async () => {
    const fixture = await seedPhase8eIssuanceFixture(prisma);

    await prisma.governmentDecision.update({
      where: { id: fixture.governmentDecisionId },
      data: { decisionStatus: 'FORMALIZATION_PENDING' },
    });

    const before = await prisma.case.findUnique({ where: { id: fixture.caseId } });

    try {
      await request(app.getHttpServer())
        .post('/api/v1/decisions-issuance/issue')
        .set('Authorization', `Bearer ${fixture.officialIdentityId}`)
        .send({
          governmentDecisionId: fixture.governmentDecisionId,
          instrumentTypeVersionId: fixture.instrumentTypeVersionId,
          caseId: fixture.caseId,
          issuerOfficeholderId: fixture.officialOfficeholderId,
          issuerOfficeId: fixture.officeId,
          holderIdentityId: fixture.applicantIdentityId,
          scope: { activity: 'test' },
          effectiveFrom: new Date().toISOString(),
        });
    } catch {
      // expected failure path
    }

    const after = await prisma.case.findUnique({ where: { id: fixture.caseId } });
    expect(after?.status).toBe(before?.status);
    expect(after?.status).not.toBe('ISSUED');
  });
});
