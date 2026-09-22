import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CustomsTradeAccessService } from './common/customs-trade-access.service';
import { CustomsTradeBoundaryService } from './common/customs-trade-boundary.service';
import { CustomsTradeController } from './customs-trade.controller';
import { CustomsTradeDashboardService } from './dashboard/customs-trade-dashboard.service';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { OfficialTradeController } from './experience/official-trade.controller';
import { OfficialTradeProjectionService } from './experience/services/official-trade-projection.service';
import { TradeScopeService } from './experience/services/trade-scope.service';
import { TradeExperienceBoundaryService } from './experience/trade-experience-boundary.service';
import { CustomsAssessmentPaymentService } from './payments/customs-assessment-payment.service';
import { TradeOrganizationProfileService } from './profile/trade-organization-profile.service';
import { CustomsReleaseService } from './release/customs-release.service';
import { CustomsReleaseEligibilityService } from './release/customs-release-eligibility.service';
import { PublicCustomsTradeVerificationController } from './verification/public-customs-trade-verification.controller';
import { PublicCustomsTradeVerificationService } from './verification/public-customs-trade-verification.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule],
  controllers: [
    CustomsTradeController,
    OfficialTradeController,
    PublicCustomsTradeVerificationController,
  ],
  providers: [
    CustomsTradeBoundaryService,
    CustomsTradeAccessService,
    TradeExperienceBoundaryService,
    TradeScopeService,
    OfficialTradeProjectionService,
    TradeOrganizationProfileService,
    CustomsDeclarationService,
    CustomsAssessmentPaymentService,
    CustomsReleaseEligibilityService,
    CustomsReleaseService,
    CustomsTradeDashboardService,
    PublicCustomsTradeVerificationService,
  ],
  exports: [
    CustomsTradeBoundaryService,
    CustomsTradeAccessService,
    TradeExperienceBoundaryService,
    TradeScopeService,
    OfficialTradeProjectionService,
    TradeOrganizationProfileService,
    CustomsDeclarationService,
    CustomsAssessmentPaymentService,
    CustomsReleaseEligibilityService,
    CustomsReleaseService,
    CustomsTradeDashboardService,
    PublicCustomsTradeVerificationService,
  ],
})
export class CustomsTradeModule {}
