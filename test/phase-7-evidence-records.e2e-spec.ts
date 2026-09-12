import { type INestApplication } from '@nestjs/common';
import { CaseStatus, EvidencePacketStatus, EvidenceStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createPhase7IntegrationApp, resetAllTestData } from './helpers/phase-7-integration-app';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import {
  asApplicationBody,
  asReferralBody,
  asSubmitApplicationResponseBody,
} from './helpers/phase-6-test-types';
import {
  createAndFreezePacket,
  seedPhase7Fixture,
  verifyAndAcceptEvidence,
} from './helpers/phase-7-test-fixtures';
import { asEvidenceBody, asMasterFileBody, asPacketBody } from './helpers/phase-7-test-types';

describe('Phase 7 evidence records (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createPhase7IntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('happy path to DECISION_PENDING', () => {
    it('processes submission through evidence packet freeze without issuing instruments', async () => {
      const fixture = await seedPhase6Fixture(app, prisma);

      const draft = asApplicationBody(
        (
          await request(app.getHttpServer())
            .post('/api/v1/applications')
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              governmentServiceVersionId: fixture.governmentServiceVersionId,
              formDefinitionId: fixture.formDefinitionId,
              formVersionId: fixture.formVersionId,
              configurationFingerprint: fixture.configurationFingerprint,
              applicantCategory: 'INDIVIDUAL',
              draftAnswers: VALID_FORM_ANSWERS,
            })
            .expect(201)
        ).body,
      );

      const submitResult = asSubmitApplicationResponseBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/applications/${draft.id}/submit`)
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              answers: VALID_FORM_ANSWERS,
              configurationFingerprint: fixture.configurationFingerprint,
              idempotencyKey: 'phase7-happy-path',
            })
            .expect(201)
        ).body,
      );

      const caseId = submitResult.case.id;

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({ officeholderId: fixture.officialOfficeholderId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/completeness-reviews`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          applicationSubmissionId: submitResult.submission.id,
          checklistResults: fixture.checklistItemCodes.map((code) => ({
            itemCode: code,
            status: 'PRESENT',
          })),
        })
        .expect(201);

      const masterFile = asMasterFileBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/cases/${caseId}/master-file`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({ title: 'Business Permit Master File' })
            .expect(201)
        ).body,
      );

      const document = (
        await request(app.getHttpServer())
          .post(`/api/v1/master-files/${masterFile.id}/documents`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            title: 'Business Registration',
            content: 'document-content-base64',
            mimeType: 'application/pdf',
          })
          .expect(201)
      ).body as { id: string };

      const evidence = asEvidenceBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/master-files/${masterFile.id}/evidence`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({
              title: 'Business Plan Evidence',
              documentRecordId: document.id,
              requirementCode: fixture.checklistItemCodes[0],
            })
            .expect(201)
        ).body,
      );
      expect(evidence.status).toBe(EvidenceStatus.RECEIVED);

      await request(app.getHttpServer())
        .post(`/api/v1/evidence/${evidence.id}/verify`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          officeholderId: fixture.officialOfficeholderId,
          findings: 'Authentic business registration verified',
        })
        .expect(201);

      const accepted = asEvidenceBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/evidence/${evidence.id}/accept`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({
              purposeType: 'DECISION_SUPPORT',
              officeholderId: fixture.officialOfficeholderId,
            })
            .expect(201)
        ).body,
      );
      expect(accepted.status).toBe(EvidenceStatus.ACCEPTED);

      const packet = asPacketBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/master-files/${masterFile.id}/packets`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({ title: 'Decision Support Packet' })
            .expect(201)
        ).body,
      );

      await request(app.getHttpServer())
        .post(`/api/v1/packets/${packet.id}/items`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          evidenceRecordId: evidence.id,
          sequenceNumber: 1,
          purposeType: 'DECISION_SUPPORT',
        })
        .expect(201);

      const frozen = asPacketBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/packets/${packet.id}/freeze`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .expect(201)
        ).body,
      );
      expect(frozen.status).toBe(EvidencePacketStatus.SEALED);
      expect(frozen.sealedAt).toBeTruthy();

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/substantive-review/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          officeholderId: fixture.officialOfficeholderId,
          officeId: fixture.officeId,
          appointmentId: fixture.appointmentId,
          institutionId: fixture.institutionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-review-a/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-review-b/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-join/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      const referral = asReferralBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/cases/${caseId}/referrals`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({
              referralType: 'EXTERNAL_AUTHORITY',
              externalAuthorityId: fixture.externalAuthorityId,
              authorityDependencyId: fixture.authorityDependencyId,
              referralBasis: 'Regulatory concurrence required',
            })
            .expect(201)
        ).body,
      );

      await request(app.getHttpServer())
        .post(`/api/v1/cases/referrals/${referral.id}/responses`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          responseReference: 'EXT-RESP-P7',
          responseSummary: 'Authenticated concurrence received',
          authenticationStatus: 'AUTHENTICATED',
          satisfiesDependency: true,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/external-referral/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
      expect(caseRecord?.status).toBe(CaseStatus.DECISION_PENDING);
      expect(caseRecord?.evidencePacketReference).toBe(frozen.packetReference);
      expect(caseRecord?.masterAdministrativeFileReference).toBe(masterFile.fileReference);

      const forbiddenTables = [
        'government_decisions',
        'issued_licenses',
        'issued_permits',
        'issued_certificates',
      ];
      for (const table of forbiddenTables) {
        const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${table}'`,
        );
        expect(Number(result[0]?.count ?? 0)).toBe(0);
      }
    });
  });

  describe('seeded fixture shortcut', () => {
    it('supports packet freeze from phase 7 fixture', async () => {
      const fixture = await seedPhase7Fixture(app, prisma);
      await verifyAndAcceptEvidence(app, fixture);
      const { packetId } = await createAndFreezePacket(app, fixture);

      const packet = await prisma.evidencePacket.findUnique({ where: { id: packetId } });
      expect(packet?.status).toBe(EvidencePacketStatus.SEALED);
    });
  });
});
