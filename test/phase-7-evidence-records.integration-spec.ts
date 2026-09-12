import { type INestApplication } from '@nestjs/common';
import {
  EvidencePacketStatus,
  EvidencePurposeType,
  EvidenceStatus,
  LegalHoldTargetType,
  RecordCorrectionStatus,
  ReviewRecordStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { MasterFileCompletenessService } from '../src/evidence-records/completeness/master-file-completeness.service';
import { PrismaService } from '../src/database/prisma.service';
import { createPhase7IntegrationApp, resetAllTestData } from './helpers/phase-7-integration-app';
import {
  createAndFreezePacket,
  recordGovernmentCommunication,
  seedPhase7Fixture,
  verifyAndAcceptEvidence,
} from './helpers/phase-7-test-fixtures';
import { asCompletenessBody, asEvidenceBody } from './helpers/phase-7-test-types';

describe('Phase 7 evidence records (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let completeness: MasterFileCompletenessService;

  beforeAll(async () => {
    ({ app } = await createPhase7IntegrationApp());
    prisma = app.get(PrismaService);
    completeness = app.get(MasterFileCompletenessService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('normal flow', () => {
    it('opens master file, registers document and evidence, verifies and accepts', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const masterFile = await prisma.masterAdministrativeFile.findUnique({
        where: { id: fixture.masterFileId },
        include: { documents: true, evidenceRecords: true },
      });
      expect(masterFile?.caseId).toBe(fixture.caseId);
      expect(masterFile?.documents).toHaveLength(1);
      expect(masterFile?.evidenceRecords).toHaveLength(1);

      const { evidenceStatus } = await verifyAndAcceptEvidence(app, fixture);
      expect(evidenceStatus).toBe(EvidenceStatus.ACCEPTED);

      const assessment = asCompletenessBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/master-files/${fixture.masterFileId}/completeness`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({ requiredRequirementCodes: [fixture.requirementCodes[0]] })
            .expect(201)
        ).body,
      );
      expect(assessment.outcome).toBe('COMPLETE');
    });
  });

  describe('correction flow', () => {
    it('requires approval before applying record correction without overwriting original', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const correction = (
        await request(app.getHttpServer())
          .post('/api/v1/record-corrections')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            targetRecordType: 'DocumentRecord',
            targetRecordId: fixture.documentId,
            reason: 'Correct document title typo',
            correctionPayload: { title: 'Corrected Title' },
          })
          .expect(201)
      ).body as { id: string; status: string };

      expect(correction.status).toBe(RecordCorrectionStatus.DRAFT);

      await request(app.getHttpServer())
        .post(`/api/v1/record-corrections/${correction.id}/apply`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/v1/record-corrections/${correction.id}/approve`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .expect(201);

      const applied = (
        await request(app.getHttpServer())
          .post(`/api/v1/record-corrections/${correction.id}/apply`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(201)
      ).body as { id: string; status: string };

      expect(applied.status).toBe(RecordCorrectionStatus.APPLIED);
      expect(applied.id).not.toBe(correction.id);

      const original = await prisma.recordCorrection.findUnique({ where: { id: correction.id } });
      expect(original?.status).toBe(RecordCorrectionStatus.APPLIED);
    });
  });

  describe('disputed evidence', () => {
    it('marks evidence disputed and reports INCOMPLETE completeness', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      await request(app.getHttpServer())
        .post(`/api/v1/evidence/${fixture.evidenceId}/dispute`)
        .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
        .send({ reason: 'Document does not match submitted information' })
        .expect(201);

      const disputed = asEvidenceBody(
        (
          await request(app.getHttpServer())
            .get(`/api/v1/evidence/${fixture.evidenceId}`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .expect(200)
        ).body,
      );
      expect(disputed.status).toBe(EvidenceStatus.DISPUTED);

      const assessment = completeness.assess({
        masterAdministrativeFileId: fixture.masterFileId,
        requiredRequirementCodes: fixture.requirementCodes,
        evidenceRecords: [
          {
            id: fixture.evidenceId,
            status: EvidenceStatus.DISPUTED,
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

  describe('professional review', () => {
    it('records professional review without creating government decision', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const review = (
        await request(app.getHttpServer())
          .post('/api/v1/professional-reviews')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            masterAdministrativeFileId: fixture.masterFileId,
            externalAuthorityId: fixture.externalAuthorityId,
            reviewerReference: 'PEER-ENG-001',
            findings: 'Technical design meets standards',
          })
          .expect(201)
      ).body as { status: string; isGovernmentDecision: boolean };

      expect(review.status).toBe(ReviewRecordStatus.IN_PROGRESS);
      expect(review.isGovernmentDecision).toBe(false);

      const decisionTables = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'government_decisions'`,
      );
      expect(Number(decisionTables[0]?.count ?? 0)).toBe(0);
    });
  });

  describe('government response', () => {
    it('records government communication without mutating case status', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);
      const caseBefore = await prisma.case.findUnique({ where: { id: fixture.caseId } });

      const communication = await recordGovernmentCommunication(app, fixture);
      expect(communication.mutatesCaseStatus).toBe(false);

      const caseAfter = await prisma.case.findUnique({ where: { id: fixture.caseId } });
      expect(caseAfter?.status).toBe(caseBefore?.status);
    });
  });

  describe('inspection custody', () => {
    it('maintains custody chain for inspection evidence', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      const inspection = (
        await request(app.getHttpServer())
          .post('/api/v1/inspections')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            masterAdministrativeFileId: fixture.masterFileId,
            inspectorOfficeholderId: fixture.officialOfficeholderId,
          })
          .expect(201)
      ).body as { id: string };

      await prisma.inspectionEvidenceItem.create({
        data: {
          inspectionRecordId: inspection.id,
          evidenceRecordId: fixture.evidenceId,
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/inspections/${inspection.id}/custody-transfers`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          evidenceRecordId: fixture.evidenceId,
          actorOfficeholderId: fixture.officialOfficeholderId,
          fromLocationRef: 'INTAKE-DESK',
          toLocationRef: 'INSPECTION-LAB',
        })
        .expect(201);

      const custodyEvents = await prisma.evidenceCustodyEvent.findMany({
        where: { evidenceRecordId: fixture.evidenceId },
        orderBy: { occurredAt: 'asc' },
      });
      expect(custodyEvents.length).toBeGreaterThanOrEqual(2);
      expect(custodyEvents.some((event) => event.eventType === 'RECEIVED')).toBe(true);
      expect(custodyEvents.some((event) => event.eventType === 'TRANSFERRED')).toBe(true);
    });
  });

  describe('legal hold', () => {
    it('blocks disposition while legal hold is active', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);

      await request(app.getHttpServer())
        .post('/api/v1/legal-holds')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          title: 'Litigation Hold',
          reason: 'Pending court order',
          targetType: LegalHoldTargetType.EVIDENCE,
          evidenceRecordId: fixture.evidenceId,
        })
        .expect(201);

      const schedule = await prisma.retentionSchedule.create({
        data: { scheduleCode: 'P7-RET', name: 'Phase 7 Retention' },
      });
      const rule = await prisma.retentionRule.create({
        data: {
          retentionScheduleId: schedule.id,
          ruleCode: 'EVD-7Y',
          recordCategory: 'EVIDENCE',
          retentionPeriodDays: 2555,
        },
      });
      const assignment = await prisma.recordRetentionAssignment.create({
        data: {
          retentionRuleId: rule.id,
          evidenceRecordId: fixture.evidenceId,
        },
      });
      const disposition = await prisma.recordDispositionRequest.create({
        data: {
          requestReference: 'DISP-P7-001',
          recordRetentionAssignmentId: assignment.id,
          status: 'APPROVED',
          requestedAction: 'DESTROY',
          reason: 'Retention period elapsed',
        },
      });

      const { EvidenceRecordsBoundaryService } = await import(
        '../src/evidence-records/common/evidence-records-boundary.service'
      );
      const boundary = app.get(EvidenceRecordsBoundaryService);
      await expect(
        boundary.assertLegalHoldDoesNotBlockDisposition('EvidenceRecord', fixture.evidenceId),
      ).rejects.toThrow(/legal hold/i);

      expect(disposition.requestedAction).toBe('DESTROY');
    });
  });

  describe('packet freeze', () => {
    it('freezes packet with accepted decision-support evidence', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);
      await verifyAndAcceptEvidence(app, fixture);

      const { packetId } = await createAndFreezePacket(app, fixture);
      const packet = await prisma.evidencePacket.findUnique({ where: { id: packetId } });
      expect(packet?.status).toBe(EvidencePacketStatus.SEALED);
      expect(packet?.sealedAt).toBeTruthy();
    });
  });
});
