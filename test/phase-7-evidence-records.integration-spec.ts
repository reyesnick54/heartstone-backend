import { type INestApplication } from '@nestjs/common';
import { EvidenceRecordStatus, LegalHoldStatus, LegalHoldTargetType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../src/evidence-records/common/evidence-records-boundary.service';
import { MasterFileCompletenessService } from '../src/evidence-records/completeness/master-file-completeness.service';
import { createPhase7IntegrationApp, resetAllTestData } from './helpers/phase-7-integration-app';
import { seedPhase7Fixture } from './helpers/phase-7-test-fixtures';
import { asCompletenessBody } from './helpers/phase-7-test-types';

describe('Phase 7H evidence records (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let completeness: MasterFileCompletenessService;
  let boundary: EvidenceRecordsBoundaryService;

  beforeAll(async () => {
    ({ app } = await createPhase7IntegrationApp());
    prisma = app.get(PrismaService);
    completeness = app.get(MasterFileCompletenessService);
    boundary = app.get(EvidenceRecordsBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('master file completeness', () => {
    it('returns UNRESOLVED when required evidence is not yet satisfied', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const assessment = asCompletenessBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/records/master-files/${fixture.masterFileId}/completeness`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({ requiredRequirementCodes: fixture.requirementCodes })
            .expect(201)
        ).body,
      );

      expect(assessment.outcome).toBe('UNRESOLVED');
      expect(assessment.masterAdministrativeFileId).toBe(fixture.masterFileId);
    });

    it('reports INCOMPLETE when disputed evidence exists', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const assessment = completeness.assess({
        masterAdministrativeFileId: fixture.masterFileId,
        requiredRequirementCodes: fixture.requirementCodes,
        evidenceRecords: [
          {
            id: 'ev-disputed',
            status: EvidenceRecordStatus.DISPUTED,
            requirementLinks: [
              { requirementCode: fixture.requirementCodes[0] ?? 'REQ-1', satisfied: false },
            ],
          },
        ],
        integrityEvents: [],
        safeHalted: false,
      });

      expect(assessment.outcome).toBe('INCOMPLETE');
    });
  });

  describe('legal hold boundary', () => {
    it('blocks disposition while legal hold is active on target reference', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);
      const targetReference = 'evidence-target-001';

      await prisma.legalHold.create({
        data: {
          holdNumber: 'HLD-P7H-001',
          title: 'Litigation Hold',
          authorityReference: 'COURT-ORDER-001',
          reason: 'Pending court order',
          issuedByIdentityId: fixture.officialIdentityId,
          effectiveFrom: new Date(),
          status: LegalHoldStatus.ACTIVE,
          targets: {
            create: {
              targetType: LegalHoldTargetType.EVIDENCE,
              targetReference,
            },
          },
        },
      });

      await expect(
        boundary.assertLegalHoldDoesNotBlockDisposition('EvidenceRecord', targetReference),
      ).rejects.toThrow(/legal hold/i);
    });
  });
});
