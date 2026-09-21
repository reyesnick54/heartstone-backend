import { type INestApplication } from '@nestjs/common';
import { CaseStatus, CommunicationReceiptType, OfficialInstrumentStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { PaymentWebhookService } from '../src/operational-support/financial/payment-webhook.service';
import {
  createOtherCitizenSession,
  seedCitizenExperienceFixture,
  seedRepresentativeCitizenFixture,
} from './helpers/citizen-experience-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { buildPaymentWebhookPayload, signPaymentWebhook } from './helpers/phase-11-test-fixtures';

describe('Citizen experience API (e2e)', () => {
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

  it('lists citizen documents excluding restricted evidence', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/documents')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = response.body as { id: string }[];
    const ids = body.map((item) => item.id);
    expect(ids).toContain(fixture.accessibleDocumentId);
    expect(ids).not.toContain(fixture.restrictedDocumentId);
  });

  it('denies cross-citizen document access', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);
    const other = await createOtherCitizenSession(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/documents/${fixture.accessibleDocumentId}`)
      .set('Authorization', `Bearer ${other.sessionToken}`)
      .expect(404);
  });

  it('represents revoked and expired instruments with authoritative status', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/credentials')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = response.body as { id: string; status: OfficialInstrumentStatus }[];
    const revoked = body.find((item) => item.id === fixture.revokedInstrumentId);
    const expired = body.find((item) => item.id === fixture.expiredInstrumentId);

    expect(revoked?.status).toBe(OfficialInstrumentStatus.REVOKED);
    expect(expired?.status).toBe(OfficialInstrumentStatus.EXPIRED);
  });

  it('denies cross-citizen credential access', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);
    const other = await createOtherCitizenSession(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/credentials/${fixture.activeInstrumentId}`)
      .set('Authorization', `Bearer ${other.sessionToken}`)
      .expect(404);
  });

  it('payment receipt does not imply approval and payment intent leaves case undecided', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);
    const caseBefore = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });

    const intentResponse = await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/payments/${fixture.invoiceId}/intents`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(201);

    const intentBody = intentResponse.body as { intentReference: string; disclaimer: string };
    expect(intentBody.disclaimer).toContain('does not alter case status');

    const paymentWebhooks = app.get(PaymentWebhookService);
    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: intentBody.intentReference,
      amountCents: fixture.standardFeeAmountCents,
      currency: 'XCD',
      externalEventId: 'citizen-exp-payment',
      succeeded: true,
      providerTransactionReference: 'citizen-exp-provider-txn',
    });
    const rawBody = JSON.stringify(payload);

    await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature: signPaymentWebhook(rawBody, fixture.webhookSecret),
    });

    const payments = await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/payments/${fixture.invoiceId}`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const paymentBody = payments.body as {
      receipts: { receiptNumber: string }[];
      disclaimer: string;
    };
    expect(paymentBody.receipts.length).toBeGreaterThan(0);
    expect(paymentBody.disclaimer).toContain('does not alter case status');

    const caseAfter = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseAfter.status).toBe(caseBefore.status);
    expect(caseAfter.status).not.toBe(CaseStatus.DECIDED);
  });

  it('denies cross-citizen payment access', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);
    const other = await createOtherCitizenSession(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/payments/${fixture.invoiceId}`)
      .set('Authorization', `Bearer ${other.sessionToken}`)
      .expect(403);
  });

  it('lists portal messages for recipient scope only', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);
    const other = await createOtherCitizenSession(app, prisma);

    const applicantMessages = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/messages')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const applicantBody = applicantMessages.body as { id: string }[];
    expect(applicantBody.map((m) => m.id)).toContain(fixture.portalMessageId);

    const otherMessages = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/messages')
      .set('Authorization', `Bearer ${other.sessionToken}`)
      .expect(200);

    const otherBody = otherMessages.body as { id: string }[];
    expect(otherBody.map((m) => m.id)).not.toContain(fixture.portalMessageId);
  });

  it('records audited message acknowledgment for portal communications', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);

    const ack = await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/messages/${fixture.portalMessageId}/acknowledge`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(201);

    const ackBody = ack.body as { receiptId: string; disclaimer: string };
    expect(ackBody.receiptId).toBeDefined();

    const receipt = await prisma.communicationReceipt.findUniqueOrThrow({
      where: { id: ackBody.receiptId },
    });
    expect(receipt.receiptType).toBe(CommunicationReceiptType.LEGAL_ACKNOWLEDGMENT);

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: {
        identityId: fixture.applicantIdentityId,
        metadata: { path: ['action'], equals: 'CITIZEN_MESSAGE_ACKNOWLEDGED' },
      },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
  });

  it('derives renewal queue from authoritative lifecycle configuration', async () => {
    const fixture = await seedCitizenExperienceFixture(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/renewals')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = response.body as {
      instrumentId: string;
      renewalEligible: boolean;
      daysUntilExpiry?: number;
    }[];

    const activeRenewal = body.find((item) => item.instrumentId === fixture.activeInstrumentId);
    expect(activeRenewal).toBeDefined();
    expect(activeRenewal?.renewalEligible).toBe(true);
    expect(activeRenewal?.daysUntilExpiry).toBeLessThanOrEqual(90);

    const expiredRenewal = body.find((item) => item.instrumentId === fixture.expiredInstrumentId);
    expect(expiredRenewal?.renewalEligible).toBe(true);
  });

  it('allows representative access to organization-held credentials within scope', async () => {
    const repFixture = await seedRepresentativeCitizenFixture(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/credentials')
      .set('Authorization', `Bearer ${repFixture.representativeSessionToken}`)
      .expect(200);

    const body = response.body as { id: string }[];
    expect(body.map((item) => item.id)).toContain(repFixture.orgInstrumentId);
  });
});
