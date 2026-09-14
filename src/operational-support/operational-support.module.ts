import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordsModule } from '../records/records.module';
import { RedressModule } from '../redress/redress.module';
import { OperationalSupportBoundaryService } from './common/operational-support-boundary.service';
import { TestEmailAdapter } from './communications/adapters/test-email.adapter';
import { TestSmsAdapter } from './communications/adapters/test-sms.adapter';
import { CommunicationDeliveryService } from './communications/communication-delivery.service';
import { CommunicationMessageService } from './communications/communication-message.service';
import { CommunicationTemplateService } from './communications/communication-template.service';
import { TestPaymentProviderAdapter } from './financial/adapters/test-payment-provider.adapter';
import { FeeAssessmentService } from './financial/fee-assessment.service';
import { FeeScheduleService } from './financial/fee-schedule.service';
import { FinancialApprovalService } from './financial/financial-approval.service';
import { InvoiceService } from './financial/invoice.service';
import { PaymentIntentService } from './financial/payment-intent.service';
import { PaymentTransactionService } from './financial/payment-transaction.service';
import { PaymentWebhookService } from './financial/payment-webhook.service';
import { PAYMENT_PROVIDER_PORT } from './financial/ports/payment-provider.port';
import { ReconciliationService } from './financial/reconciliation.service';
import { RefundService } from './financial/refund.service';
import { RefundAuthorizationService } from './financial/refund-authorization.service';
import { TestRegistryAdapter } from './integrations/adapters/test-registry.adapter';
import { IntegrationAcceptanceService } from './integrations/integration-acceptance.service';
import { IntegrationDefinitionService } from './integrations/integration-definition.service';
import { IntegrationGatewayService } from './integrations/integration-gateway.service';
import { IntegrationOutageService } from './integrations/integration-outage.service';
import { IntegrationWebhookService } from './integrations/integration-webhook.service';
import { RedressRefundBridgeService } from './integrations/redress-refund-bridge.service';
import { RegistryQueryService } from './integrations/registry-query.service';
import { SourceDiscrepancyService } from './integrations/source-discrepancy.service';
import { MafIndexingService } from './maf/maf-indexing.service';
import { OperationalSupportController } from './operational-support.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule, RecordsModule, RedressModule],
  controllers: [OperationalSupportController],
  providers: [
    OperationalSupportBoundaryService,
    FeeScheduleService,
    FeeAssessmentService,
    InvoiceService,
    PaymentIntentService,
    PaymentTransactionService,
    PaymentWebhookService,
    RefundAuthorizationService,
    RefundService,
    ReconciliationService,
    FinancialApprovalService,
    CommunicationTemplateService,
    CommunicationMessageService,
    CommunicationDeliveryService,
    TestEmailAdapter,
    TestSmsAdapter,
    IntegrationDefinitionService,
    IntegrationGatewayService,
    IntegrationWebhookService,
    RegistryQueryService,
    SourceDiscrepancyService,
    IntegrationOutageService,
    IntegrationAcceptanceService,
    TestRegistryAdapter,
    RedressRefundBridgeService,
    MafIndexingService,
    TestPaymentProviderAdapter,
    {
      provide: PAYMENT_PROVIDER_PORT,
      useExisting: TestPaymentProviderAdapter,
    },
  ],
  exports: [
    OperationalSupportBoundaryService,
    FeeScheduleService,
    FeeAssessmentService,
    InvoiceService,
    PaymentIntentService,
    PaymentTransactionService,
    PaymentWebhookService,
    RefundAuthorizationService,
    RefundService,
    ReconciliationService,
    FinancialApprovalService,
    CommunicationTemplateService,
    CommunicationMessageService,
    CommunicationDeliveryService,
    IntegrationDefinitionService,
    IntegrationGatewayService,
    IntegrationWebhookService,
    RegistryQueryService,
    SourceDiscrepancyService,
    IntegrationOutageService,
    IntegrationAcceptanceService,
    RedressRefundBridgeService,
    MafIndexingService,
  ],
})
export class OperationalSupportModule {}
