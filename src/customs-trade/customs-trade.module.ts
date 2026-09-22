import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CustomsTradeAccessService } from './access/customs-trade-access.service';
import { CustomsAssessmentService } from './assessments/customs-assessment.service';
import { CustomsTradeBoundaryService } from './common/customs-trade-boundary.service';
import { CustomsTradeController } from './customs-trade.controller';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { CustomsHoldService } from './holds/customs-hold.service';
import { CustomsReleaseService } from './release/customs-release.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomsTradeController],
  providers: [
    CustomsTradeBoundaryService,
    CustomsTradeAccessService,
    CustomsDeclarationService,
    CustomsReleaseService,
    CustomsHoldService,
    CustomsAssessmentService,
  ],
  exports: [
    CustomsTradeBoundaryService,
    CustomsTradeAccessService,
    CustomsDeclarationService,
    CustomsReleaseService,
    CustomsHoldService,
    CustomsAssessmentService,
  ],
})
export class CustomsTradeModule {}
