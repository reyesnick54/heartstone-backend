import { type INestApplication } from '@nestjs/common';
import {
  CaseStatus,
  CommunicationDeliveryStatus,
  CommunicationMessageStatus,
  IntegrationWebhookProcessingStatus,
  InvoiceStatus,
  PaymentIntentStatus,
  ReconciliationBatchStatus,
  ReconciliationItemStatus,
  RefundRequestStatus,
  RegistryQueryStatus,
  SourceDiscrepancyStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { PaymentWebhookService } from '../src/operational-support/financial/payment-webhook.service';
import { ReconciliationService } from '../src/operational-support/financial/reconciliation.service';
import { RefundService } from '../src/operational-support/financial/refund.service';
import { CommunicationDeliveryService } from '../src/operational-support/communications/communication-delivery.service';
import { CommunicationMessageService } from '../src/operational-support/communications/communication-message.service';
import { IntegrationOutageService } from '../src/operational-support/integrations/integration-outage.service';
import { IntegrationWebhookService } from '../src/operational-support/integrations/integration-webhook.service';
import { RegistryQueryService } from '../src/operational-support/integrations/registry-query.service';
import { SourceDiscrepancyService } from '../src/operational-support/integrations/source-discrepancy.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  buildPaymentWebhookPayload,
  calculateAndInvoiceFees,
  createPayablePaymentIntent,
  seedPhase11Fixture,
  signIntegrationWebhook,
  signPaymentWebhook,
} from './helpers/phase-11-test-fixtures';

describe('Phase 11 operational support (e2e)', () => {
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

  it('E2E1. standard fee/payment flow leaves case undecided after payment', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const caseBefore = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);
    const paymentWebhooks = app.get(PaymentWebhookService);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'e2e1-payment-success',
      succeeded: true,
      providerTransactionReference: 'e2e1-provider-txn',
    });
    const rawBody = JSON.stringify(payload);

    await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature: signPaymentWebhook(rawBody, fixture.webhookSecret),
    });

    const caseAfter = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseAfter.status).toBe(caseBefore.status);
    expect(caseAfter.status).not.toBe(CaseStatus.DECIDED);
    expect(await prisma.governmentDecision.count({ where: { caseId: fixture.caseId } })).toBe(0);

    const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(refreshedInvoice.status).toBe(InvoiceStatus.PAID);
  });

  it('E2E2. payment failure records failed intent without settling transaction', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);
    const paymentWebhooks = app.get(PaymentWebhookService);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'e2e2-payment-failure',
      succeeded: false,
      providerTransactionReference: 'e2e2-provider-txn',
      failureReason: 'Card declined',
    });
    const rawBody = JSON.stringify(payload);

    const result = await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature: signPaymentWebhook(rawBody, fixture.webhookSecret),
    });

    expect(result.status).toBe('PROCESSED');

    const refreshedIntent = await prisma.paymentIntent.findUniqueOrThrow({
      where: { id: paymentIntent.id },
    });
    expect(refreshedIntent.status).toBe(PaymentIntentStatus.FAILED);
    expect(refreshedIntent.failureReason).toBe('Card declined');

    const transactions = await prisma.paymentTransaction.findMany({
      where: { paymentIntentId: paymentIntent.id },
    });
    expect(transactions).toHaveLength(0);
  });

  it('E2E3. duplicate webhook idempotency returns duplicate without double settlement', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'e2e3-dup-webhook',
      succeeded: true,
      providerTransactionReference: 'e2e3-provider-txn',
    });
    const rawBody = JSON.stringify(payload);
    const signature = signPaymentWebhook(rawBody, fixture.webhookSecret);

    await request(app.getHttpServer())
      .post('/api/v1/operational-support/financial/payment-webhooks')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
        rawBody,
        signature,
      })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/operational-support/financial/payment-webhooks')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
        rawBody,
        signature,
      })
      .expect(201);

    const duplicateBody = duplicate.body as { idempotent: boolean; status: string };
    expect(duplicateBody.idempotent).toBe(true);
    expect(duplicateBody.status).toBe('DUPLICATE');

    const transactions = await prisma.paymentTransaction.findMany({
      where: { paymentIntentId: paymentIntent.id },
    });
    expect(transactions).toHaveLength(1);
  });

  it('E2E4. authorized refund processes against settled transaction with segregated authorizer', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const refunds = app.get(RefundService);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);
    const paymentWebhooks = app.get(PaymentWebhookService);

    const successPayload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'e2e4-settlement',
      succeeded: true,
      providerTransactionReference: 'e2e4-provider-txn',
    });
    const successRawBody = JSON.stringify(successPayload);
    const settlement = await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: successPayload.eventType,
      externalEventId: successPayload.externalEventId,
      payload: successPayload,
      signature: signPaymentWebhook(successRawBody, fixture.webhookSecret),
    });

    const transactionId = settlement.settlement?.transaction.id;
    if (!transactionId) {
      throw new Error('Expected settled transaction in E2E4');
    }

    const refundRequest = await refunds.requestRefund({
      paymentTransactionId: transactionId,
      requestedAmountCents: 5_000,
      reason: 'Partial fee reversal',
      requestedByIdentityId: fixture.applicantIdentityId,
    });

    const authorized = await refunds.authorizeRefund({
      refundRequestId: refundRequest.id,
      authorizerIdentityId: fixture.approverIdentityId,
      authorizerOfficeholderId: fixture.approverOfficeholderId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      authorizedAmountCents: 5_000,
      appointmentId: fixture.appointmentId,
    });

    expect(authorized.status).toBe(RefundRequestStatus.AUTHORIZED);

    const processed = await refunds.processRefund({
      refundRequestId: refundRequest.id,
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
    });

    expect(processed.status).toBe('COMPLETED');
  });

  it('E2E5. reconciliation mismatch marks batch exception until resolved', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const reconciliation = app.get(ReconciliationService);
    const paymentWebhooks = app.get(PaymentWebhookService);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'e2e5-settlement',
      succeeded: true,
      providerTransactionReference: 'e2e5-provider-txn',
    });
    const rawBody = JSON.stringify(payload);
    const settlement = await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature: signPaymentWebhook(rawBody, fixture.webhookSecret),
    });

    const transactionId = settlement.settlement?.transaction.id;
    if (!transactionId) {
      throw new Error('Expected settled transaction in E2E5');
    }

    const batch = await reconciliation.openBatch({
      institutionId: fixture.institutionId,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
    });

    const mismatchItem = await reconciliation.addItem({
      reconciliationBatchId: batch.id,
      paymentTransactionId: transactionId,
      expectedAmountCents: paymentIntent.amountCents + 100,
    });

    expect(mismatchItem.status).toBe(ReconciliationItemStatus.MISMATCH);

    const refreshedBatch = await prisma.reconciliationBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(refreshedBatch.status).toBe(ReconciliationBatchStatus.EXCEPTION);

    await reconciliation.resolveMismatchItem(mismatchItem.id, 'Provider fee variance accepted');
    await expect(
      reconciliation.closeBatch({
        reconciliationBatchId: batch.id,
        approverIdentityId: fixture.approverIdentityId,
        approverOfficeholderId: fixture.approverOfficeholderId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        appointmentId: fixture.appointmentId,
      }),
    ).resolves.toBeTruthy();
  });

  it('E2E6. mandatory decision notice delivery succeeds with decision notice reference', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const messages = app.get(CommunicationMessageService);
    const deliveries = app.get(CommunicationDeliveryService);

    const message = await messages.createMessage({
      messageReference: `${fixture.marker}-E2E6-DN`,
      channelType: 'EMAIL',
      subject: 'Mandatory decision notice',
      body: 'Your decision notice is available.',
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      communicationTemplateVersionId: fixture.communicationTemplateVersionId,
      decisionNoticeReference: `${fixture.marker}-DN-E2E6`,
      recipients: [
        {
          recipientType: 'APPLICANT',
          recipientReference: 'applicant@example.gov',
          recipientIdentityId: fixture.applicantIdentityId,
        },
      ],
    });

    await messages.approveMessage(message.id);

    const deliveryResults = await deliveries.deliverMessage({
      messageId: message.id,
      mandatoryRuleCode: fixture.mandatoryDecisionNoticeRuleCode,
    });

    expect(deliveryResults[0]?.status).toBe(CommunicationDeliveryStatus.DELIVERED);

    const refreshed = await prisma.communicationMessage.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(refreshed.status).toBe(CommunicationMessageStatus.DELIVERED);
    expect(refreshed.decisionNoticeReference).toBe(`${fixture.marker}-DN-E2E6`);
  });

  it('E2E7. communication failure on portal channel falls back to alternate channel', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const messages = app.get(CommunicationMessageService);
    const deliveries = app.get(CommunicationDeliveryService);

    const message = await messages.createMessage({
      messageReference: `${fixture.marker}-E2E7-ALT`,
      channelType: 'PORTAL',
      subject: 'Notice requiring alternate delivery',
      body: 'Portal delivery unavailable; alternate channel required.',
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      recipients: [
        {
          recipientType: 'APPLICANT',
          recipientReference: 'applicant@example.gov',
          recipientIdentityId: fixture.applicantIdentityId,
        },
      ],
    });

    await messages.approveMessage(message.id);
    const deliveryResults = await deliveries.deliverMessage({ messageId: message.id });

    expect(deliveryResults.some((delivery) => delivery.channelType === 'EMAIL')).toBe(true);
    expect(
      deliveryResults.some((delivery) => delivery.status === CommunicationDeliveryStatus.DELIVERED),
    ).toBe(true);
  });

  it('E2E8. external registry query returns completed registry response', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const registryQueries = app.get(RegistryQueryService);

    const response = await request(app.getHttpServer())
      .post('/api/v1/operational-support/integrations/registry-queries')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        integrationDefinitionId: fixture.integrationDefinitionId,
        queryReference: `${fixture.marker}-E2E8`,
        identifier: 'GOV-REG-7788',
        identifierType: 'NATIONAL_ID',
      })
      .expect(201);

    const body = response.body as { status: RegistryQueryStatus };
    expect(body.status).toBe(RegistryQueryStatus.COMPLETED);

    const query = await registryQueries.executeQuery({
      integrationDefinitionId: fixture.integrationDefinitionId,
      queryReference: `${fixture.marker}-E2E8-SERVICE`,
      identifier: 'GOV-REG-7788',
    });
    expect(query.status).toBe(RegistryQueryStatus.COMPLETED);
  });

  it('E2E9. source conflict records discrepancy and preserves both values', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const discrepancies = app.get(SourceDiscrepancyService);

    const response = await request(app.getHttpServer())
      .post('/api/v1/operational-support/integrations/discrepancies')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        integrationDefinitionId: fixture.integrationDefinitionId,
        fieldReference: 'registeredName',
        localValue: 'Local Registered Name',
        externalValue: 'External Registry Name',
        material: true,
      })
      .expect(201);

    const body = response.body as {
      id: string;
      status: SourceDiscrepancyStatus;
      localValue: string;
      externalValue: string;
    };
    expect(body.status).toBe(SourceDiscrepancyStatus.SAFE_HALTED);
    expect(body.localValue).toBe('Local Registered Name');
    expect(body.externalValue).toBe('External Registry Name');

    const stored = await discrepancies.getDiscrepancy(body.id);
    expect(stored?.localValue).toBe('Local Registered Name');
    expect(stored?.externalValue).toBe('External Registry Name');
  });

  it('E2E10. government system outage activates fallback and blocks live exchange', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const outages = app.get(IntegrationOutageService);

    const response = await request(app.getHttpServer())
      .post(
        `/api/v1/operational-support/integrations/outages/${fixture.integrationDefinitionId}/fallback`,
      )
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        fallbackMode: 'MANUAL_REGISTRY_LOOKUP',
        impactSummary: 'Government registry outage confirmed',
      })
      .expect(201);

    const body = response.body as { status: string };
    expect(body.status).toBe('CONFIRMED');

    await expect(outages.assertExchangeAllowed(fixture.integrationDefinitionId)).rejects.toThrow(
      /confirmed outage/i,
    );
  });

  it('E2E11. authorized government update webhook is authenticated and processed', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const integrationWebhooks = app.get(IntegrationWebhookService);

    const payload = {
      eventType: 'GOVERNMENT_RECORD_UPDATE',
      externalEventId: 'e2e11-authorized-update',
      fieldReference: 'registeredName',
      authoritativeSourceCode: `${fixture.marker}-GOV-REGISTRY`,
      newValue: 'Authorized Registry Update',
      authorized: true,
    };
    const payloadString = JSON.stringify(payload);
    const signature = signIntegrationWebhook(payloadString, fixture.integrationWebhookSecret);

    const event = await integrationWebhooks.receiveWebhook({
      integrationDefinitionId: fixture.integrationDefinitionId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature,
    });

    expect(event.processingStatus).toBe(IntegrationWebhookProcessingStatus.PROCESSED);

    const httpResponse = await request(app.getHttpServer())
      .post('/api/v1/operational-support/integrations/webhooks')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        integrationDefinitionId: fixture.integrationDefinitionId,
        eventType: 'GOVERNMENT_RECORD_UPDATE',
        externalEventId: 'e2e11-authorized-update-http',
        payload: {
          fieldReference: 'registeredName',
          authorized: true,
          newValue: 'Authorized via HTTP',
        },
        signature: signIntegrationWebhook(
          JSON.stringify({
            fieldReference: 'registeredName',
            authorized: true,
            newValue: 'Authorized via HTTP',
          }),
          fixture.integrationWebhookSecret,
        ),
      })
      .expect(201);

    expect(httpResponse.body.processingStatus).toBe(IntegrationWebhookProcessingStatus.PROCESSED);
  });

  it('E2E12. prohibited government update is blocked via material source discrepancy safe halt', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const discrepancies = app.get(SourceDiscrepancyService);

    const prohibitedUpdate = await discrepancies.recordDiscrepancy({
      integrationDefinitionId: fixture.integrationDefinitionId,
      fieldReference: 'legalStatus',
      localValue: 'ACTIVE',
      externalValue: 'REVOKED_WITHOUT_AUTHORITY',
      material: true,
    });

    expect(prohibitedUpdate.status).toBe(SourceDiscrepancyStatus.SAFE_HALTED);

    await expect(
      discrepancies.resolveDiscrepancy(
        prohibitedUpdate.id,
        'Attempted automatic override',
        fixture.officialIdentityId,
      ),
    ).rejects.toThrow(/institutional review/i);

    const unauthorizedPayload = {
      eventType: 'GOVERNMENT_RECORD_UPDATE',
      externalEventId: 'e2e12-prohibited-update',
      fieldReference: 'legalStatus',
      newValue: 'REVOKED_WITHOUT_AUTHORITY',
      authorized: false,
    };

    await request(app.getHttpServer())
      .post('/api/v1/operational-support/integrations/webhooks')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        integrationDefinitionId: fixture.integrationDefinitionId,
        eventType: unauthorizedPayload.eventType,
        externalEventId: unauthorizedPayload.externalEventId,
        payload: unauthorizedPayload,
        signature: 'invalid-signature',
      })
      .expect(400);

    const events = await prisma.integrationWebhookEvent.findMany({
      where: { integrationDefinitionId: fixture.integrationDefinitionId },
    });
    expect(events.some((event) => event.externalEventId === unauthorizedPayload.externalEventId)).toBe(
      false,
    );
  });
});
