import { type INestApplication } from '@nestjs/common';
import {
  InstrumentAcknowledgmentMethod,
  InstrumentDeliveryChannel,
  InstrumentDeliveryStatus,
  InstrumentVerificationStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { InstrumentDeliveryService } from '../src/decisions-issuance/delivery/instrument-delivery.service';
import { IssuanceService } from '../src/decisions-issuance/issuance/issuance.service';
import { InstrumentReceiptService } from '../src/decisions-issuance/receipt/instrument-receipt.service';
import { InstrumentVerificationService } from '../src/decisions-issuance/verification/instrument-verification.service';
import {
  resetDecisionsIssuanceData,
  seedPhase8fDeliveryFixture,
} from './helpers/decisions-issuance-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 8F delivery, receipt, and verification (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let issuanceService: IssuanceService;
  let deliveryService: InstrumentDeliveryService;
  let receiptService: InstrumentReceiptService;
  let verificationService: InstrumentVerificationService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    issuanceService = app.get(IssuanceService);
    deliveryService = app.get(InstrumentDeliveryService);
    receiptService = app.get(InstrumentReceiptService);
    verificationService = app.get(InstrumentVerificationService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    await resetDecisionsIssuanceData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('separates issuance, delivery, receipt, and validity while supporting verification and exact download', async () => {
    const fixture = await seedPhase8fDeliveryFixture(app, prisma);

    const { instrument, instrumentVersion } = await issuanceService.issue({
      governmentDecisionId: fixture.governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { summary: 'Public scope summary', activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01'),
      freeFormFields: { holderName: 'Applicant Holder' },
      idempotencyKey: 'phase-8f-success-1',
    });

    expect(instrument.status).toBe(OfficialInstrumentStatus.ISSUED);
    expect(await deliveryService.listDeliveriesForInstrument(instrument.id)).toHaveLength(0);

    const delivery = await deliveryService.prepareDelivery({
      officialInstrumentId: instrument.id,
      instrumentVersionId: instrumentVersion.id,
      recipientIdentityId: fixture.applicantIdentityId,
      deliveryChannel: InstrumentDeliveryChannel.PORTAL,
      destinationReference: 'portal://applicant/inbox',
      actorIdentityId: fixture.officialIdentityId,
    });

    expect(delivery.status).toBe(InstrumentDeliveryStatus.PREPARED);

    const { attempt } = await deliveryService.sendDelivery(delivery.id, fixture.officialIdentityId);
    await deliveryService.markFailed(delivery.id, attempt.id, 'temporary provider outage');

    const stillIssued = await prisma.officialInstrument.findUnique({ where: { id: instrument.id } });
    expect(stillIssued?.status).toBe(OfficialInstrumentStatus.ISSUED);

    const { attempt: retryAttempt } = await deliveryService.sendDelivery(
      delivery.id,
      fixture.officialIdentityId,
    );
    expect(retryAttempt.attemptNumber).toBe(2);

    await deliveryService.markDelivered(delivery.id, retryAttempt.id, 'proof-123');

    await receiptService.recordReceipt({
      officialInstrumentId: instrument.id,
      instrumentVersionId: instrumentVersion.id,
      recipientIdentityId: fixture.applicantIdentityId,
      receivedAt: new Date(),
      acknowledgmentMethod: InstrumentAcknowledgmentMethod.PORTAL_CONFIRMATION,
      instrumentDeliveryId: delivery.id,
      instrumentDeliveryAttemptId: retryAttempt.id,
    });

    await prisma.officialInstrument.update({
      where: { id: instrument.id },
      data: { status: OfficialInstrumentStatus.SUSPENDED },
    });

    const verificationRecord = await verificationService.createVerificationRecord(instrument.id);

    const publicSuspended = await request(app.getHttpServer())
      .get(`/api/v1/public/instruments/verify/${verificationRecord.verificationCode}`)
      .expect(200);

    const publicSuspendedBody = publicSuspended.body as {
      verificationStatus: string;
      qrReferenceDisclaimer: string;
      evidencePacket?: unknown;
    };

    expect(publicSuspendedBody.verificationStatus).toBe(InstrumentVerificationStatus.SUSPENDED);
    expect(publicSuspendedBody).not.toHaveProperty('evidencePacket');
    expect(publicSuspendedBody.qrReferenceDisclaimer).toContain('does not prove authenticity');

    const sourceDecision = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });

    const restrictedReadiness = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: 'NON_PRODUCTION_DECISIONS_ISSUANCE_TEST_ONLY-DRA-002',
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'READY',
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        evidencePacketVersionId: sourceDecision.evidencePacketVersionId,
      },
    });

    const restrictedDecision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: 'NON_PRODUCTION_DECISIONS_ISSUANCE_TEST_ONLY-DEC-000002',
        caseId: sourceDecision.caseId,
        masterAdministrativeFileId: sourceDecision.masterAdministrativeFileId,
        decisionTypeVersionId: sourceDecision.decisionTypeVersionId,
        functionAuthorityRecordId: sourceDecision.functionAuthorityRecordId,
        authorityEvaluationRecordId: sourceDecision.authorityEvaluationRecordId,
        decisionReadinessAssessmentId: restrictedReadiness.id,
        evidencePacketVersionId: sourceDecision.evidencePacketVersionId,
        decisionMakerIdentityId: sourceDecision.decisionMakerIdentityId,
        decisionMakerOfficeholderId: sourceDecision.decisionMakerOfficeholderId,
        appointmentId: sourceDecision.appointmentId,
        institutionId: sourceDecision.institutionId,
        departmentId: sourceDecision.departmentId,
        matterDecided: 'Restricted instrument authorization',
        outcome: 'APPROVED',
        decidedAt: new Date(),
        integrityHash: 'phase-8f-restricted-integrity',
      },
    });

    const restrictedIssued = await issuanceService.issue({
      governmentDecisionId: restrictedDecision.id,
      instrumentTypeVersionId: fixture.restrictedInstrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      scope: { summary: 'Restricted scope' },
      effectiveFrom: new Date('2026-01-01'),
      idempotencyKey: 'phase-8f-restricted-1',
    });

    const restrictedVerification = await verificationService.createVerificationRecord(
      restrictedIssued.instrument.id,
    );

    const restrictedPublic = await request(app.getHttpServer())
      .get(`/api/v1/public/instruments/verify/${restrictedVerification.verificationCode}`)
      .expect(200);

    const restrictedPublicBody = restrictedPublic.body as {
      verificationStatus: string;
      instrumentNumber?: string;
    };

    expect(restrictedPublicBody.verificationStatus).toBe(
      InstrumentVerificationStatus.NOT_PUBLICLY_DISCLOSABLE,
    );
    expect(restrictedPublicBody.instrumentNumber).toBeUndefined();

    await request(app.getHttpServer())
      .get(`/api/v1/instruments/${instrument.id}/download`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/instruments/${instrument.id}/download`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/v1/instruments/${instrument.id}/download`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200);

    expect(downloadResponse.headers['x-content-sha256']).toBe(instrumentVersion.contentHash);
    expect((downloadResponse.body as Buffer).length).toBeGreaterThan(0);
  });
});
