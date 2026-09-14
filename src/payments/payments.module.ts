import { Module } from '@nestjs/common';

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
