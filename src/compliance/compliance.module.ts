import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { ObligationRecurrenceService } from './common/obligation-recurrence.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceMatterService } from './matters/compliance-matter.service';
import { ContinuingObligationService } from './obligations/continuing-obligation.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [ComplianceController],
  providers: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
  ],
  exports: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
  ],
})
export class ComplianceModule {}
