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
  ],
})
export class PaymentsModule {}
