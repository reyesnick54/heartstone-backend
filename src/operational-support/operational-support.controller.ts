import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CommunicationChannelType,
  IntegrationAcceptanceStatus,
  IntegrationDefinitionStatus,
  IntegrationEndpointDirection,
} from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CommunicationDeliveryService } from './communications/communication-delivery.service';
import { CommunicationMessageService } from './communications/communication-message.service';
import { CommunicationTemplateService } from './communications/communication-template.service';
import { FeeAssessmentService } from './financial/fee-assessment.service';
import { FeeScheduleService } from './financial/fee-schedule.service';
import { FinancialApprovalService } from './financial/financial-approval.service';
import { InvoiceService } from './financial/invoice.service';
import { PaymentIntentService } from './financial/payment-intent.service';
import { PaymentTransactionService } from './financial/payment-transaction.service';
import { PaymentWebhookService } from './financial/payment-webhook.service';
import { ReconciliationService } from './financial/reconciliation.service';
import { RefundAuthorizationService } from './financial/refund-authorization.service';
import { IntegrationAcceptanceService } from './integrations/integration-acceptance.service';
import { IntegrationDefinitionService } from './integrations/integration-definition.service';
import { IntegrationGatewayService } from './integrations/integration-gateway.service';
import { IntegrationOutageService } from './integrations/integration-outage.service';
import { IntegrationWebhookService } from './integrations/integration-webhook.service';
import { RedressRefundBridgeService } from './integrations/redress-refund-bridge.service';
import { RegistryQueryService } from './integrations/registry-query.service';
import { SourceDiscrepancyService } from './integrations/source-discrepancy.service';
import { MafIndexingService } from './maf/maf-indexing.service';
import { OPERATIONAL_SUPPORT_BOUNDARY_DISCLAIMER } from './operational-support.constants';

@ApiTags('operational-support')
@Controller('operational-support')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class OperationalSupportController {
  constructor(
    private readonly feeSchedules: FeeScheduleService,
    private readonly feeAssessments: FeeAssessmentService,
    private readonly invoices: InvoiceService,
    private readonly paymentIntents: PaymentIntentService,
    private readonly paymentTransactions: PaymentTransactionService,
    private readonly paymentWebhooks: PaymentWebhookService,
    private readonly refundAuthorizations: RefundAuthorizationService,
    private readonly reconciliation: ReconciliationService,
    private readonly financialApprovals: FinancialApprovalService,
    private readonly templates: CommunicationTemplateService,
    private readonly messages: CommunicationMessageService,
    private readonly deliveries: CommunicationDeliveryService,
    private readonly integrationDefinitions: IntegrationDefinitionService,
    private readonly integrationGateway: IntegrationGatewayService,
    private readonly integrationWebhooks: IntegrationWebhookService,
    private readonly registryQueries: RegistryQueryService,
    private readonly sourceDiscrepancies: SourceDiscrepancyService,
    private readonly integrationOutages: IntegrationOutageService,
    private readonly integrationAcceptance: IntegrationAcceptanceService,
    private readonly redressRefundBridge: RedressRefundBridgeService,
    private readonly mafIndexing: MafIndexingService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Operational support boundary disclaimer' })
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: OPERATIONAL_SUPPORT_BOUNDARY_DISCLAIMER };
  }

  @Get('maf/:masterAdministrativeFileId/index')
  @ApiOperation({ summary: 'Index Phase 11 records to MAF sections 14 and 15' })
  indexMaf(@Param('masterAdministrativeFileId', ParseUUIDPipe) masterAdministrativeFileId: string) {
    return this.mafIndexing.buildOperationalSupportIndex(masterAdministrativeFileId);
  }

  @Post('communications/templates')
  createTemplate(
    @Body()
    body: {
      code: string;
      name: string;
      channelType: CommunicationChannelType;
      institutionId?: string;
    },
  ) {
    return this.templates.createTemplate(body);
  }

  @Post('communications/templates/versions')
  createTemplateVersion(
    @Body()
    body: {
      communicationTemplateId: string;
      versionNumber: string;
      subjectTemplate: string;
      bodyTemplate: string;
      locale?: string;
    },
  ) {
    return this.templates.createVersion(body);
  }

  @Post('communications/messages')
  createMessage(@Body() body: Parameters<CommunicationMessageService['createMessage']>[0]) {
    return this.messages.createMessage(body);
  }

  @Post('communications/messages/:id/approve')
  approveMessage(@Param('id', ParseUUIDPipe) id: string) {
    return this.messages.approveMessage(id);
  }

  @Post('communications/messages/:id/deliver')
  deliverMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { mandatoryRuleCode?: string },
  ) {
    return this.deliveries.deliverMessage({ messageId: id, mandatoryRuleCode: body.mandatoryRuleCode });
  }

  @Post('integrations/definitions')
  createIntegrationDefinition(
    @Body()
    body: {
      institutionId: string;
      code: string;
      name: string;
      description?: string;
      technologyDependencyId?: string;
    },
  ) {
    return this.integrationDefinitions.createDefinition(body);
  }

  @Post('integrations/definitions/:id/endpoints')
  createIntegrationEndpoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      integrationVersionId: string;
      endpointCode: string;
      direction: IntegrationEndpointDirection;
      urlTemplate: string;
      protocol: string;
      authenticationMethod?: string;
    },
  ) {
    return this.integrationDefinitions.createEndpoint(body);
  }

  @Post('integrations/exchanges')
  executeExchange(@Body() body: Parameters<IntegrationGatewayService['executeAuthorizedExchange']>[0]) {
    return this.integrationGateway.executeAuthorizedExchange(body);
  }

  @Post('integrations/webhooks')
  receiveIntegrationWebhook(@Body() body: Parameters<IntegrationWebhookService['receiveWebhook']>[0]) {
    return this.integrationWebhooks.receiveWebhook(body);
  }

  @Post('integrations/registry-queries')
  executeRegistryQuery(@Body() body: Parameters<RegistryQueryService['executeQuery']>[0]) {
    return this.registryQueries.executeQuery(body);
  }

  @Post('integrations/discrepancies')
  recordDiscrepancy(@Body() body: Parameters<SourceDiscrepancyService['recordDiscrepancy']>[0]) {
    return this.sourceDiscrepancies.recordDiscrepancy(body);
  }

  @Post('integrations/acceptance')
  recordAcceptance(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      integrationDefinitionId: string;
      acceptanceStatus: IntegrationAcceptanceStatus;
      notes?: string;
      validUntil?: string;
    },
  ) {
    return this.integrationAcceptance.recordAcceptance({
      integrationDefinitionId: body.integrationDefinitionId,
      acceptanceStatus: body.acceptanceStatus,
      assessedByIdentityId: session.identityId,
      notes: body.notes,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });
  }

  @Post('integrations/redress-refunds')
  executeRedressRefund(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      actionId: string;
      paymentTransactionId: string;
      requestedAmountCents: number;
      reason: string;
    },
  ) {
    return this.redressRefundBridge.executeRefundIfAuthorized({
      ...body,
      requestedByIdentityId: session.identityId,
      authorizedByIdentityId: session.identityId,
    });
  }

  @Get('financial/invoices/:invoiceNumber')
  getInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoices.findByNumber(invoiceNumber);
  }

  @Get('financial/payment-intents/:intentReference')
  getPaymentIntent(@Param('intentReference') intentReference: string) {
    return this.paymentIntents.findByReference(intentReference);
  }

  @Post('integrations/definitions/:id/status')
  updateIntegrationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: IntegrationDefinitionStatus },
  ) {
    return this.integrationDefinitions.updateDefinitionStatus(id, body.status);
  }

  @Post('financial/payment-webhooks')
  receivePaymentWebhook(@Body() body: Parameters<PaymentWebhookService['processWebhook']>[0]) {
    return this.paymentWebhooks.processWebhook(body);
  }

  @Get('financial/approvals/:id')
  getFinancialApproval(@Param('id', ParseUUIDPipe) id: string) {
    return this.financialApprovals.getByIdOrThrow(id);
  }

  @Get('financial/reconciliation/:batchReference')
  getReconciliationBatch(@Param('batchReference') batchReference: string) {
    return this.reconciliation.getBatchByReferenceOrThrow(batchReference);
  }

  @Get('financial/fee-assessments/:id')
  getFeeAssessment(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeAssessments.getByIdOrThrow(id);
  }

  @Get('financial/refund-authorizations/:authorizationReference')
  getRefundAuthorization(@Param('authorizationReference') authorizationReference: string) {
    return this.refundAuthorizations.findByReference(authorizationReference);
  }

  @Get('financial/payment-transactions/:id')
  getPaymentTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentTransactions.getByIdOrThrow(id);
  }

  @Get('integrations/definitions/:id')
  getIntegrationDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.integrationDefinitions.getDefinition(id);
  }

  @Get('integrations/definitions/:id/acceptance')
  getAcceptanceDossier(@Param('id', ParseUUIDPipe) id: string) {
    return this.integrationAcceptance.getAcceptanceDossier(id);
  }

  @Post('integrations/outages/:integrationDefinitionId/fallback')
  activateFallback(
    @Param('integrationDefinitionId', ParseUUIDPipe) integrationDefinitionId: string,
    @Body() body: { fallbackMode: string; impactSummary?: string },
  ) {
    return this.integrationOutages.activateFallback(
      integrationDefinitionId,
      body.fallbackMode,
      body.impactSummary,
    );
  }
}
