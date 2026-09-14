import { type INestApplication } from '@nestjs/common';
import {
  CommunicationDeliveryStatus,
  CommunicationMessageStatus,
  IntegrationAcceptanceStatus,
  IntegrationDefinitionStatus,
  InvoiceStatus,
  PaymentIntentStatus,
  PaymentTransactionStatus,
  RegistryQueryStatus,
  SourceDiscrepancyStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { CommunicationDeliveryService } from '../src/operational-support/communications/communication-delivery.service';
import { CommunicationMessageService } from '../src/operational-support/communications/communication-message.service';
import { FeeAssessmentService } from '../src/operational-support/financial/fee-assessment.service';
import { InvoiceService } from '../src/operational-support/financial/invoice.service';
import { PaymentWebhookService } from '../src/operational-support/financial/payment-webhook.service';
import { IntegrationAcceptanceService } from '../src/operational-support/integrations/integration-acceptance.service';
import { IntegrationOutageService } from '../src/operational-support/integrations/integration-outage.service';
import { RegistryQueryService } from '../src/operational-support/integrations/registry-query.service';
import { SourceDiscrepancyService } from '../src/operational-support/integrations/source-discrepancy.service';
import { MafIndexingService } from '../src/operational-support/maf/maf-indexing.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  buildPaymentWebhookPayload,
  calculateAndInvoiceFees,
  createPayablePaymentIntent,
  seedPhase11Fixture,
  signPaymentWebhook,
} from './helpers/phase-11-test-fixtures';

describe('Phase 11 operational support (integration)', () => {
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

  it('calculates fees from active approved schedule and issues payable invoice without changing case disposition', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const feeAssessments = app.get(FeeAssessmentService);
    const invoices = app.get(InvoiceService);

    const caseBefore = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    const assessment = await feeAssessments.calculateAssessment({
      institutionId: fixture.institutionId,
      governmentServiceVersionId: fixture.governmentServiceVersionId,
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
    });

    expect(assessment.totalAmountCents).toBe(fixture.standardFeeAmountCents);

    const invoice = await invoices.issueInvoice({
      feeAssessmentId: assessment.id,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
    });

    expect(invoice.status).toBe(InvoiceStatus.ISSUED);
    expect(invoice.totalAmountCents).toBe(fixture.standardFeeAmountCents);

    const caseAfter = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseAfter.status).toBe(caseBefore.status);
    expect(await prisma.governmentDecision.count({ where: { caseId: fixture.caseId } })).toBe(0);
  });

  it('settles payment via authenticated webhook and records receipt without mutating case or decision', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);
    const paymentWebhooks = app.get(PaymentWebhookService);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'integration-settlement-1',
      succeeded: true,
      providerTransactionReference: 'provider-txn-integration-1',
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
    expect(result.settlement?.receipt).toBeTruthy();
    expect(result.settlement?.receiptDisclaimer).toContain('does not alter case status');

    const refreshedIntent = await prisma.paymentIntent.findUniqueOrThrow({
      where: { id: paymentIntent.id },
    });
    expect(refreshedIntent.status).toBe(PaymentIntentStatus.SUCCEEDED);

    const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(refreshedInvoice.status).toBe(InvoiceStatus.PAID);

    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseRecord.status).not.toBe('DECIDED');
  });

  it('treats duplicate processed payment webhooks as idempotent', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const { invoice } = await calculateAndInvoiceFees(app, fixture);
    const paymentIntent = await createPayablePaymentIntent(app, fixture, invoice.id);
    const paymentWebhooks = app.get(PaymentWebhookService);

    const payload = buildPaymentWebhookPayload({
      paymentIntentReference: paymentIntent.intentReference,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      externalEventId: 'integration-dup-1',
      succeeded: true,
      providerTransactionReference: 'provider-txn-integration-dup',
    });
    const rawBody = JSON.stringify(payload);
    const signature = signPaymentWebhook(rawBody, fixture.webhookSecret);

    const first = await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature,
    });
    const second = await paymentWebhooks.receiveWebhook({
      paymentProviderConfigurationId: fixture.paymentProviderConfigurationId,
      eventType: payload.eventType,
      externalEventId: payload.externalEventId,
      payload,
      signature,
    });

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);

    const transactions = await prisma.paymentTransaction.findMany({
      where: { paymentIntentId: paymentIntent.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.status).toBe(PaymentTransactionStatus.SETTLED);
  });

  it('delivers mandatory decision notice communications and indexes records to MAF sections', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const messages = app.get(CommunicationMessageService);
    const deliveries = app.get(CommunicationDeliveryService);
    const mafIndexing = app.get(MafIndexingService);

    const message = await messages.createMessage({
      messageReference: `${fixture.marker}-DECISION-NOTICE-001`,
      channelType: 'EMAIL',
      subject: 'Decision notice issued',
      body: 'This notice accompanies the recorded decision.',
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      communicationTemplateVersionId: fixture.communicationTemplateVersionId,
      decisionNoticeReference: `${fixture.marker}-DN-000001`,
      recipients: [
        {
          recipientType: 'APPLICANT',
          recipientReference: 'applicant@example.gov',
          recipientIdentityId: fixture.applicantIdentityId,
          displayName: 'Applicant',
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
    expect(refreshed.decisionNoticeReference).toBe(`${fixture.marker}-DN-000001`);

    const index = await mafIndexing.buildOperationalSupportIndex(
      fixture.masterAdministrativeFileId,
    );
    expect(index.section15.some((entry) => entry.referenceType === 'CommunicationMessage')).toBe(
      true,
    );
  });

  it('progresses integration acceptance dossier to operationally active', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const acceptance = app.get(IntegrationAcceptanceService);

    const dossier = await acceptance.getAcceptanceDossier(fixture.integrationDefinitionId);
    expect(dossier.currentStatus).toBe(IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE);
    expect(dossier.records.length).toBeGreaterThanOrEqual(5);

    const definition = await prisma.integrationDefinition.findUniqueOrThrow({
      where: { id: fixture.integrationDefinitionId },
    });
    expect(definition.status).toBe(IntegrationDefinitionStatus.ACTIVE);
  });

  it('executes registry query and records source discrepancies with safe halt for material conflicts', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const registryQueries = app.get(RegistryQueryService);
    const discrepancies = app.get(SourceDiscrepancyService);

    const query = await registryQueries.executeQuery({
      integrationDefinitionId: fixture.integrationDefinitionId,
      queryReference: `${fixture.marker}-RQ-001`,
      identifier: 'REG-12345',
      identifierType: 'NATIONAL_ID',
    });

    expect(query.status).toBe(RegistryQueryStatus.COMPLETED);

    const openDiscrepancy = await discrepancies.recordDiscrepancy({
      integrationDefinitionId: fixture.integrationDefinitionId,
      fieldReference: 'registeredName',
      localValue: 'Local Holder Name',
      externalValue: 'External Registry Name',
      material: false,
    });
    expect(openDiscrepancy.status).toBe(SourceDiscrepancyStatus.OPEN);

    const haltedDiscrepancy = await discrepancies.recordDiscrepancy({
      integrationDefinitionId: fixture.integrationDefinitionId,
      fieldReference: 'registeredStatus',
      localValue: 'ACTIVE',
      externalValue: 'REVOKED',
      material: true,
    });
    expect(haltedDiscrepancy.status).toBe(SourceDiscrepancyStatus.SAFE_HALTED);
    expect(haltedDiscrepancy.localValue).toBe('ACTIVE');
    expect(haltedDiscrepancy.externalValue).toBe('REVOKED');
  });

  it('blocks outbound integration exchange during confirmed outage fallback', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const outages = app.get(IntegrationOutageService);

    await outages.activateFallback(
      fixture.integrationDefinitionId,
      'MANUAL_REGISTRY_LOOKUP',
      'Government registry unavailable',
    );

    await expect(outages.assertExchangeAllowed(fixture.integrationDefinitionId)).rejects.toThrow(
      /confirmed outage/i,
    );
  });

  it('uses alternate communication channel when primary portal delivery fails', async () => {
    const fixture = await seedPhase11Fixture(app, prisma);
    const messages = app.get(CommunicationMessageService);
    const deliveries = app.get(CommunicationDeliveryService);

    const message = await messages.createMessage({
      messageReference: `${fixture.marker}-ALT-CHANNEL-001`,
      channelType: 'PORTAL',
      subject: 'Notice with alternate channel',
      body: 'Primary portal channel is unavailable; alternate channel should be attempted.',
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
});
