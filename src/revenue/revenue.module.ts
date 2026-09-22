import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CitizenExperienceModule } from '../experience/citizen/citizen-experience.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { TaxpayerAccountService } from './accounts/taxpayer-account.service';
import { TaxAssessmentService } from './assessments/tax-assessment.service';
import { TaxAuditMatterService } from './audit/tax-audit-matter.service';
import { ConfigurableTaxCalculationEngine } from './calculation/configurable-tax-calculation.engine';
import { TaxCalculationService } from './calculation/tax-calculation.service';
import { TaxClearanceService } from './clearance/tax-clearance.service';
import { RevenueAccessService } from './common/revenue-access.service';
import { RevenueBoundaryService } from './common/revenue-boundary.service';
import { CitizenRevenueController } from './experience/citizen-revenue.controller';
import { OfficialRevenueController } from './experience/official-revenue.controller';
import { RevenueExperienceBoundaryService } from './experience/revenue-experience-boundary.service';
import { CitizenRevenueProjectionService } from './experience/services/citizen-revenue-projection.service';
import { OfficialRevenueProjectionService } from './experience/services/official-revenue-projection.service';
import { RevenueScopeService } from './experience/services/revenue-scope.service';
import { TaxPaymentAllocationService } from './payments/tax-payment-allocation.service';
import { TaxRefundService } from './refunds/tax-refund.service';
import { TaxReturnService } from './returns/tax-return.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, CitizenExperienceModule, OfficialModule],
  controllers: [RevenueController, CitizenRevenueController, OfficialRevenueController],
  providers: [
    RevenueBoundaryService,
    RevenueAccessService,
    RevenueExperienceBoundaryService,
    RevenueScopeService,
    CitizenRevenueProjectionService,
    OfficialRevenueProjectionService,
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
    RevenueExperienceBoundaryService,
    RevenueScopeService,
    CitizenRevenueProjectionService,
    OfficialRevenueProjectionService,
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
