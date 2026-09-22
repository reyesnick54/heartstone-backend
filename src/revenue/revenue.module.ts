import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { TaxpayerAccountService } from './accounts/taxpayer-account.service';
import { TaxAssessmentService } from './assessments/tax-assessment.service';
import { TaxAuditMatterService } from './audit/tax-audit-matter.service';
import { ConfigurableTaxCalculationEngine } from './calculation/configurable-tax-calculation.engine';
import { TaxCalculationService } from './calculation/tax-calculation.service';
import { TaxClearanceService } from './clearance/tax-clearance.service';
import { RevenueAccessService } from './common/revenue-access.service';
import { RevenueBoundaryService } from './common/revenue-boundary.service';
import { TaxPaymentAllocationService } from './payments/tax-payment-allocation.service';
import { TaxRefundService } from './refunds/tax-refund.service';
import { TaxReturnService } from './returns/tax-return.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [RevenueController],
  providers: [
    RevenueBoundaryService,
    RevenueAccessService,
    ConfigurableTaxCalculationEngine,
    TaxCalculationService,
    TaxpayerAccountService,
    TaxReturnService,
    TaxAssessmentService,
    TaxPaymentAllocationService,
    TaxRefundService,
    TaxClearanceService,
    TaxAuditMatterService,
  ],
  exports: [
    RevenueBoundaryService,
    RevenueAccessService,
    TaxCalculationService,
    TaxpayerAccountService,
    TaxReturnService,
    TaxAssessmentService,
    TaxPaymentAllocationService,
    TaxRefundService,
    TaxClearanceService,
    TaxAuditMatterService,
  ],
})
export class RevenueModule {}
