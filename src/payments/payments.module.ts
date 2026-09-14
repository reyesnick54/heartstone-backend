import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { NoopPaymentProviderAdapter } from './adapters/noop-payment-provider.adapter';
import { FeeAdjustmentService } from './adjustments/fee-adjustment.service';
import { FinancialApprovalService } from './approvals/financial-approval.service';
import { ArrearsService } from './arrears/arrears.service';
import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { FinancialDisputeService } from './disputes/financial-dispute.service';
import { PaymentsController } from './payments.controller';
import { PAYMENT_PROVIDER_PORT } from './ports/payment-provider.port';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { PaymentsRefundLifecycleService } from './redress/payments-refund-lifecycle.service';
import { RefundService } from './refunds/refund.service';
import { FinancialReversalService } from './reversals/financial-reversal.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsBoundaryService,
    FeeAdjustmentService,
    RefundService,
    ReconciliationService,
    ArrearsService,
    FinancialDisputeService,
    FinancialApprovalService,
    FinancialReversalService,
    PaymentsRefundLifecycleService,
    NoopPaymentProviderAdapter,
    {
      provide: PAYMENT_PROVIDER_PORT,
      useExisting: NoopPaymentProviderAdapter,
    },
  ],
  exports: [
    PaymentsBoundaryService,
    FeeAdjustmentService,
    RefundService,
    ReconciliationService,
    ArrearsService,
    FinancialDisputeService,
    FinancialApprovalService,
    FinancialReversalService,
    PaymentsRefundLifecycleService,
import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { DeterministicTestPaymentProviderAdapter } from './adapters/deterministic-test-payment-provider.adapter';
import { PaymentProviderRegistryService } from './adapters/payment-provider-registry.service';
import { PaymentAllocationService } from './allocations/payment-allocation.service';
import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { PaymentIntentService } from './intents/payment-intent.service';
import { InvoiceService } from './invoicing/invoice.service';
import { ManualPaymentService } from './manual/manual-payment.service';
import { PaymentsController } from './payments.controller';
import {
  PaymentChannelService,
  PaymentProviderConfigurationService,
} from './providers/payment-provider-configuration.service';
import { PaymentReceiptService } from './receipts/payment-receipt.service';
import { PaymentWebhookService } from './webhooks/payment-webhook.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsBoundaryService,
    DeterministicTestPaymentProviderAdapter,
    PaymentProviderRegistryService,
    InvoiceService,
    PaymentIntentService,
    PaymentWebhookService,
    PaymentAllocationService,
    PaymentReceiptService,
    ManualPaymentService,
    PaymentChannelService,
    PaymentProviderConfigurationService,
  ],
  exports: [
    PaymentsBoundaryService,
    InvoiceService,
    PaymentIntentService,
    PaymentWebhookService,
    PaymentReceiptService,
    ManualPaymentService,
    PaymentProviderRegistryService,
  ],
})
export class PaymentsModule {}
