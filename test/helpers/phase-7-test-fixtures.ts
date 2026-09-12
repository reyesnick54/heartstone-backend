import { CaseCommunicationChannel, EvidencePurposeType, type EvidenceStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './phase-6-test-fixtures';
import { asApplicationBody, asSubmitApplicationResponseBody } from './phase-6-test-types';
import {
  asEvidenceBody,
  asMasterFileBody,
  asPacketBody,
  type Phase7FixtureContext,
} from './phase-7-test-types';

export type { Phase7FixtureContext };

export async function seedPhase7Fixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<Phase7FixtureContext> {
  const phase6 = await seedPhase6Fixture(app, prisma);

  const draft = asApplicationBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${phase6.applicantSessionToken}`)
        .send({
          governmentServiceVersionId: phase6.governmentServiceVersionId,
          formDefinitionId: phase6.formDefinitionId,
          formVersionId: phase6.formVersionId,
          configurationFingerprint: phase6.configurationFingerprint,
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
        .set('Authorization', `Bearer ${phase6.applicantSessionToken}`)
        .send({
          answers: VALID_FORM_ANSWERS,
          configurationFingerprint: phase6.configurationFingerprint,
          idempotencyKey: `phase7-${String(Date.now())}`,
        })
        .expect(201)
    ).body,
  );

  const caseId = submitResult.case.id;

  await request(app.getHttpServer())
    .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
    .set('Authorization', `Bearer ${phase6.officialSessionToken}`)
    .send({ officeholderId: phase6.officialOfficeholderId })
    .expect(201);

  const masterFile = asMasterFileBody(
    (
      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/master-file`)
        .set('Authorization', `Bearer ${phase6.officialSessionToken}`)
        .send({ title: 'Phase 7 Test Master File' })
        .expect(201)
    ).body,
  );

  const document = (
    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${masterFile.id}/documents`)
      .set('Authorization', `Bearer ${phase6.officialSessionToken}`)
      .send({
        title: 'Business Registration Certificate',
        content: 'base64-document-content-phase7',
        mimeType: 'application/pdf',
        sectionKey: 'intake',
      })
      .expect(201)
  ).body as { id: string; documentReference: string };

  const evidence = asEvidenceBody(
    (
      await request(app.getHttpServer())
        .post(`/api/v1/master-files/${masterFile.id}/evidence`)
        .set('Authorization', `Bearer ${phase6.officialSessionToken}`)
        .send({
          title: 'Identity Proof',
          documentRecordId: document.id,
          requirementCode: phase6.checklistItemCodes[0],
          requirementLabel: 'Identity Proof',
        })
        .expect(201)
    ).body,
  );

  return {
    ...phase6,
    caseId,
    applicationId: draft.id,
    submissionId: submitResult.submission.id,
    masterFileId: masterFile.id,
    masterFileReference: masterFile.fileReference,
    documentId: document.id,
    documentReference: document.documentReference,
    evidenceId: evidence.id,
    evidenceReference: evidence.evidenceReference,
    requirementCodes: phase6.checklistItemCodes,
  };
}

export async function verifyAndAcceptEvidence(
  app: { getHttpServer: () => App },
  fixture: Phase7FixtureContext,
): Promise<{ evidenceStatus: EvidenceStatus }> {
  await request(app.getHttpServer())
    .post(`/api/v1/evidence/${fixture.evidenceId}/verify`)
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      officeholderId: fixture.officialOfficeholderId,
      findings: 'Document authenticity confirmed',
    })
    .expect(201);

  const accepted = asEvidenceBody(
    (
      await request(app.getHttpServer())
        .post(`/api/v1/evidence/${fixture.evidenceId}/accept`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          purposeType: EvidencePurposeType.DECISION_SUPPORT,
          officeholderId: fixture.officialOfficeholderId,
        })
        .expect(201)
    ).body,
  );

  return { evidenceStatus: accepted.status as EvidenceStatus };
}

export async function createAndFreezePacket(
  app: { getHttpServer: () => App },
  fixture: Phase7FixtureContext,
): Promise<{ packetId: string; packetReference: string }> {
  const packet = asPacketBody(
    (
      await request(app.getHttpServer())
        .post(`/api/v1/master-files/${fixture.masterFileId}/packets`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({ title: 'Decision Support Packet' })
        .expect(201)
    ).body,
  );

  await request(app.getHttpServer())
    .post(`/api/v1/packets/${packet.id}/items`)
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      evidenceRecordId: fixture.evidenceId,
      sequenceNumber: 1,
      purposeType: EvidencePurposeType.DECISION_SUPPORT,
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

  return { packetId: frozen.id, packetReference: frozen.packetReference };
}

export async function recordGovernmentCommunication(
  app: { getHttpServer: () => App },
  fixture: Phase7FixtureContext,
  bodyText = 'Official request for additional information',
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/government-communications')
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      masterAdministrativeFileId: fixture.masterFileId,
      channel: CaseCommunicationChannel.PORTAL,
      subject: 'Additional information required',
      body: bodyText,
    })
    .expect(201);

  return response.body as { mutatesCaseStatus: boolean };
}
