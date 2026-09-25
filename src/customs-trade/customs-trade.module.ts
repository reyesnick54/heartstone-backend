import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CustomsTradeAccessService } from './access/customs-trade-access.service';
import { CustomsAssessmentService } from './assessments/customs-assessment.service';
import { CustomsTradeBoundaryService } from './common/customs-trade-boundary.service';
import { CustomsTradeController } from './customs-trade.controller';
import { CustomsTradeDashboardService } from './dashboard/customs-trade-dashboard.service';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { OfficialTradeController } from './experience/official-trade.controller';
import { OfficialTradeProjectionService } from './experience/services/official-trade-projection.service';
import { TradeScopeService } from './experience/services/trade-scope.service';
import { TradeExperienceBoundaryService } from './experience/trade-experience-boundary.service';
import { CustomsHoldService } from './holds/customs-hold.service';
import { TraderAccountProfileService } from './profile/trader-account-profile.service';
import { CustomsReleaseService } from './release/customs-release.service';
import { PublicCustomsTradeVerificationController } from './verification/public-customs-trade-verification.controller';
import { PublicCustomsTradeVerificationService } from './verification/public-customs-trade-verification.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
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
    TraderAccountProfileService,
    CustomsDeclarationService,
    CustomsReleaseService,
    CustomsHoldService,
    CustomsAssessmentService,
    CustomsTradeDashboardService,
    PublicCustomsTradeVerificationService,
  ],
  exports: [
    CustomsTradeBoundaryService,
    CustomsTradeAccessService,
    TradeExperienceBoundaryService,
    TradeScopeService,
    OfficialTradeProjectionService,
    TraderAccountProfileService,
    CustomsDeclarationService,
    CustomsReleaseService,
    CustomsHoldService,
    CustomsAssessmentService,
    CustomsTradeDashboardService,
    PublicCustomsTradeVerificationService,
  ],
})
export class CustomsTradeModule {}
