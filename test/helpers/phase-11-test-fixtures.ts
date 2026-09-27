import { createHash, createHmac } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  AuthoritativeSourceStatus,
  AuthorityActionType,
  CommunicationChannelType,
  CommunicationTemplateStatus,
  IntegrationAcceptanceStatus,
  IntegrationEndpointDirection,
  MandatoryCommunicationRuleStatus,
  PaymentChannelType,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { PrismaService } from '../../src/database/prisma.service';
import { FeeAssessmentService } from '../../src/operational-support/financial/fee-assessment.service';
import { FeeScheduleService } from '../../src/operational-support/financial/fee-schedule.service';
import { InvoiceService } from '../../src/operational-support/financial/invoice.service';
import { PaymentIntentService } from '../../src/operational-support/financial/payment-intent.service';
import { IntegrationAcceptanceService } from '../../src/operational-support/integrations/integration-acceptance.service';
import { IntegrationDefinitionService } from '../../src/operational-support/integrations/integration-definition.service';
import { type Phase8FixtureContext, seedPhase8Fixture } from './phase-8-test-fixtures';

export const NON_PRODUCTION_PHASE_11_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_11_OPS';

export interface Phase11FixtureContext extends Phase8FixtureContext {
  governmentServiceId: string;
  governmentServiceVersionId: string;
  feeScheduleId: string;
  feeScheduleVersionId: string;
  feeItemCode: string;
  standardFeeAmountCents: number;
  paymentChannelDefinitionId: string;
  paymentProviderConfigurationId: string;
  webhookSecret: string;
  communicationTemplateId: string;
  communicationTemplateVersionId: string;
  mandatoryDecisionNoticeRuleCode: string;
  integrationDefinitionId: string;
  integrationVersionId: string;
  integrationEndpointId: string;
  integrationWebhookSecret: string;
  authoritativeSourceDesignationId: string;
  authorizedFieldMappingId: string;
}

export function signPaymentWebhook(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function signIntegrationWebhook(payload: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${payload}`).digest('hex');
}

export async function seedPhase11Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase11FixtureContext> {
  const marker = NON_PRODUCTION_PHASE_11_FIXTURE_MARKER;
  const phase8 = await seedPhase8Fixture(app, prisma);

  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: phase8.caseId },
    select: { governmentServiceId: true, governmentServiceVersionId: true },
  });

  const governmentServiceId = caseRecord.governmentServiceId;
  const governmentServiceVersionId = caseRecord.governmentServiceVersionId;
  const feeItemCode = `${marker}-APPLICATION`;
  const standardFeeAmountCents = 15_000;

  await prisma.governmentServiceFeeDefinition.upsert({
    where: {
      governmentServiceVersionId_code: {
        governmentServiceVersionId,
        code: feeItemCode,
      },
    },
    create: {
      governmentServiceVersionId,
      code: feeItemCode,
      label: 'Application processing fee',
      amountCents: standardFeeAmountCents,
      currency: 'XCD',
      sortOrder: 1,
    },
    update: {
      amountCents: standardFeeAmountCents,
      currency: 'XCD',
    },
  });

  await prisma.authorityActionRight.createMany({
    data: [
      {
        functionAuthorityRecordId: phase8.functionAuthorityRecordId,
        action: AuthorityActionType.APPROVE,
        permitted: true,
        requiresHumanActor: true,
      },
    ],
    skipDuplicates: true,
  });

  const feeScheduleService = app.get(FeeScheduleService);
  const feeSchedule = await feeScheduleService.createSchedule({
    institutionId: phase8.institutionId,
    governmentServiceId,
    code: `${marker}-FEE`,
    name: 'Phase 11 Standard Fee Schedule',
    currency: 'XCD',
    items: [
      {
        itemCode: feeItemCode,
        label: 'Application processing fee',
        amountCents: standardFeeAmountCents,
        currency: 'XCD',
        sortOrder: 1,
      },
    ],
  });

  const feeScheduleVersion = feeSchedule.versions[0];
  if (!feeScheduleVersion) {
    throw new Error('Expected fee schedule version in Phase 11 fixture');
  }

  await feeScheduleService.submitVersionForApproval(feeScheduleVersion.id);
  await feeScheduleService.approveVersion(feeScheduleVersion.id, phase8.approverIdentityId);
  await feeScheduleService.activateVersion({
    feeScheduleVersionId: feeScheduleVersion.id,
    approverIdentityId: phase8.approverIdentityId,
    approverOfficeholderId: phase8.approverOfficeholderId,
    functionAuthorityRecordId: phase8.functionAuthorityRecordId,
    appointmentId: phase8.approverAppointmentId,
    effectiveFrom: new Date('2020-01-01'),
  });

  const paymentChannel = await prisma.paymentChannelDefinition.create({
    data: {
      code: `${marker}-CARD`,
      name: 'Phase 11 Test Card Channel',
      channelType: PaymentChannelType.CARD,
    },
  });

  const webhookSecret = 'phase-11-test-webhook-secret';
  const paymentProvider = await prisma.paymentProviderConfiguration.create({
    data: {
      paymentChannelDefinitionId: paymentChannel.id,
      institutionId: phase8.institutionId,
      providerCode: 'TEST',
      providerName: 'Phase 11 Test Provider',
      configuration: { webhookSecret },
      isActive: true,
    },
  });

  const communicationTemplate = await prisma.communicationTemplate.create({
    data: {
      code: `${marker}-DECISION-NOTICE`,
      name: 'Decision Notice Template',
      channelType: CommunicationChannelType.EMAIL,
      institutionId: phase8.institutionId,
      status: CommunicationTemplateStatus.DRAFT,
      versions: {
        create: {
          versionNumber: '1.0.0',
          subjectTemplate: 'Decision notice for case {{caseNumber}}',
          bodyTemplate: 'Your decision notice reference is {{decisionNoticeReference}}.',
          locale: 'en',
          status: CommunicationTemplateStatus.APPROVED,
          approvedAt: new Date(),
        },
      },
    },
    include: { versions: true },
  });

  const templateVersion = communicationTemplate.versions[0];
  if (!templateVersion) {
    throw new Error('Expected communication template version in Phase 11 fixture');
  }

  await prisma.communicationTemplate.update({
    where: { id: communicationTemplate.id },
    data: { status: CommunicationTemplateStatus.ACTIVE },
  });

  await prisma.communicationTemplateVersion.update({
    where: { id: templateVersion.id },
    data: {
      status: CommunicationTemplateStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const mandatoryDecisionNoticeRuleCode = `${marker}-MANDATORY-DECISION-NOTICE`;
  await prisma.mandatoryCommunicationRule.create({
    data: {
      ruleCode: mandatoryDecisionNoticeRuleCode,
      institutionId: phase8.institutionId,
      governmentServiceId,
      triggerEvent: 'DECISION_RECORDED',
      channelType: CommunicationChannelType.EMAIL,
      templateReference: communicationTemplate.code,
      status: MandatoryCommunicationRuleStatus.ACTIVE,
    },
  });

  const integrationDefinitions = app.get(IntegrationDefinitionService);
  const integrationAcceptance = app.get(IntegrationAcceptanceService);
  const integrationWebhookSecret = 'phase-11-integration-webhook-secret';

  const integrationDefinition = await integrationDefinitions.createDefinition({
    institutionId: phase8.institutionId,
    code: `${marker}-REGISTRY`,
    name: 'Phase 11 Government Registry Integration',
    description: 'Test registry integration for Phase 11',
  });

  const integrationVersion = await integrationDefinitions.createVersion({
    integrationDefinitionId: integrationDefinition.id,
    versionNumber: '1.0.0',
    specificationReference: `${marker}-SPEC`,
    effectiveFrom: new Date('2020-01-01'),
  });

  const integrationEndpoint = await integrationDefinitions.createEndpoint({
    integrationVersionId: integrationVersion.id,
    endpointCode: 'QUERY',
    direction: IntegrationEndpointDirection.OUTBOUND,
    urlTemplate: 'https://example.gov/registry/{identifier}',
    protocol: 'HTTPS',
    authenticationMethod: 'MUTUAL_TLS',
  });

  await prisma.integrationCredentialReference.create({
    data: {
      integrationDefinitionId: integrationDefinition.id,
      credentialAlias: 'webhook',
      vaultReference: integrationWebhookSecret,
    },
  });

  const acceptanceStatuses: IntegrationAcceptanceStatus[] = [
    IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED,
    IntegrationAcceptanceStatus.TESTED,
    IntegrationAcceptanceStatus.TECHNICALLY_READY,
    IntegrationAcceptanceStatus.INSTITUTIONALLY_ACCEPTED,
    IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE,
  ];

  for (const acceptanceStatus of acceptanceStatuses) {
    await integrationAcceptance.recordAcceptance({
      integrationDefinitionId: integrationDefinition.id,
      acceptanceStatus,
      assessedByIdentityId: phase8.officialIdentityId,
      notes: `Phase 11 fixture acceptance: ${acceptanceStatus}`,
    });
  }

  const authoritativeSource = await prisma.authoritativeSourceDesignation.create({
    data: {
      sourceCode: `${marker}-GOV-REGISTRY`,
      sourceName: 'Phase 11 Government Registry',
      institutionId: phase8.institutionId,
      status: AuthoritativeSourceStatus.AUTHORITATIVE,
    },
  });

  const dataExchangeContract = await prisma.dataExchangeContract.create({
    data: {
      integrationVersionId: integrationVersion.id,
      contractCode: `${marker}-CONTRACT`,
      name: 'Registry status contract',
      schemaReference: `${marker}-SCHEMA`,
    },
  });

  const dataExchangeField = await prisma.dataExchangeField.create({
    data: {
      dataExchangeContractId: dataExchangeContract.id,
      fieldCode: 'registeredName',
      fieldPath: 'registeredName',
      dataType: 'string',
      direction: 'INBOUND',
      isRequired: true,
    },
  });

  const authorizedFieldMapping = await prisma.fieldAuthorityMapping.create({
    data: {
      dataExchangeFieldId: dataExchangeField.id,
      authoritativeSourceDesignationId: authoritativeSource.id,
      mappingRule: 'Government registry is authoritative for registeredName',
      priority: 1,
    },
  });

  return {
    ...phase8,
    governmentServiceId,
    governmentServiceVersionId,
    feeScheduleId: feeSchedule.id,
    feeScheduleVersionId: feeScheduleVersion.id,
    feeItemCode,
    standardFeeAmountCents,
    paymentChannelDefinitionId: paymentChannel.id,
    paymentProviderConfigurationId: paymentProvider.id,
    webhookSecret,
    communicationTemplateId: communicationTemplate.id,
    communicationTemplateVersionId: templateVersion.id,
    mandatoryDecisionNoticeRuleCode,
    integrationDefinitionId: integrationDefinition.id,
    integrationVersionId: integrationVersion.id,
    integrationEndpointId: integrationEndpoint.id,
    integrationWebhookSecret,
    authoritativeSourceDesignationId: authoritativeSource.id,
    authorizedFieldMappingId: authorizedFieldMapping.id,
  };
}

export async function calculateAndInvoiceFees(
  app: INestApplication<App>,
  fixture: Phase11FixtureContext,
) {
  const feeAssessments = app.get(FeeAssessmentService);
  const invoices = app.get(InvoiceService);
  const prisma = app.get(PrismaService);
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: fixture.caseId },
    select: { applicationId: true },
  });

  const assessment = await feeAssessments.calculateAssessment({
    institutionId: fixture.institutionId,
    governmentServiceVersionId: fixture.governmentServiceVersionId,
    caseId: fixture.caseId,
    applicationId: caseRecord.applicationId,
    masterAdministrativeFileId: fixture.masterAdministrativeFileId,
  });

  const invoice = await invoices.issueInvoice({
    feeAssessmentId: assessment.id,
    masterAdministrativeFileId: fixture.masterAdministrativeFileId,
  });

  return { assessment, invoice };
}

export async function createPayablePaymentIntent(
  app: INestApplication<App>,
  fixture: Phase11FixtureContext,
  invoiceId: string,
) {
  const paymentIntents = app.get(PaymentIntentService);
  return paymentIntents.createPaymentIntent({ invoiceId });
}

export function buildPaymentWebhookPayload(options: {
  paymentIntentReference: string;
  amountCents: number;
  currency: string;
  externalEventId: string;
  succeeded: boolean;
  providerTransactionReference: string;
  failureReason?: string;
}) {
  return {
    eventType: options.succeeded ? 'payment.succeeded' : 'payment.failed',
    externalEventId: options.externalEventId,
    paymentIntentReference: options.paymentIntentReference,
    amountCents: options.amountCents,
    currency: options.currency,
    succeeded: options.succeeded,
    providerTransactionReference: options.providerTransactionReference,
    failureReason: options.failureReason,
  };
}
