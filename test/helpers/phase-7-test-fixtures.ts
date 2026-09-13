import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CaseFoundationService } from '../../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../../src/database/prisma.service';
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './application-processing-test-fixtures';
import { type Phase7FixtureContext } from './phase-7-test-types';

export type { Phase7FixtureContext };

export async function seedPhase7Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase7FixtureContext> {
  const fixture = await seedApplicationProcessingFixture(app, prisma);
  const foundation = app.get(CaseFoundationService);
  const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

  const masterFileResponse = await request(app.getHttpServer())
    .get(`/api/v1/records/master-files/by-case/${caseId}`)
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .expect(200);

  const masterFile = masterFileResponse.body as { id: string; fileNumber: string };

  return {
    caseId,
    masterFileId: masterFile.id,
    masterFileNumber: masterFile.fileNumber,
    applicantIdentityId: fixture.applicantIdentityId,
    applicantSessionToken: fixture.applicantSessionToken,
    officialIdentityId: fixture.officialIdentityId,
    officialSessionToken: fixture.officialSessionToken,
    officialOfficeholderId: fixture.officeholderId,
    requirementCodes: ['IDENTITY_PROOF'],
    governmentServiceVersionId: fixture.governmentServiceVersionId,
    departmentId: fixture.departmentId,
  };
}
