import { type INestApplication } from '@nestjs/common';
import { OfficialInstrumentStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { ComplianceBoundaryService } from '../src/compliance/common/compliance-boundary.service';
import { type PrismaService } from '../src/database/prisma.service';
import { CorrectiveActionService } from '../src/inspection-compliance/corrective-action/corrective-action.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 inspection and compliance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;
  let correctiveActionService: CorrectiveActionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
    correctiveActionService = app.get(CorrectiveActionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens compliance matter for issued instrument holder', async () => {
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

    const body = response.body as { complianceMatterNumber: string };
    expect(body.complianceMatterNumber).toMatch(/^CM-/);
  });

  it('does not mutate instrument status through compliance API', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });
    const before = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });

    expect(() => {
      boundary.assertPhase9CannotPatchInstrumentStatus({
        status: OfficialInstrumentStatus.SUSPENDED,
      });
    }).toThrow(/cannot PATCH official instrument/i);

    const after = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });
    expect(after.status).toBe(before.status);
    expect(correctiveActionService).toBeDefined();
  });
});
