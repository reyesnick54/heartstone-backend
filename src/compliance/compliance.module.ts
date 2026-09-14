import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { ObligationRecurrenceService } from './common/obligation-recurrence.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceMatterService } from './matters/compliance-matter.service';
import { ContinuingObligationService } from './obligations/continuing-obligation.service';
import { ComplianceDashboardService } from './oversight/compliance-dashboard.service';
import { ComplianceMonitoringService } from './oversight/compliance-monitoring.service';
import { ComplianceProjectionService } from './oversight/compliance-projection.service';
import { ComplianceRevalidationService } from './oversight/compliance-revalidation.service';
import { ComplianceStatusController } from './oversight/compliance-status.controller';
import { ComplianceStatusBoundaryService } from './oversight/compliance-status-boundary.service';
import { ComplianceReviewService } from './reviews/compliance-review.service';
import { ComplianceSubmissionService } from './submissions/compliance-submission.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [ComplianceController, ComplianceStatusController],
  providers: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    ComplianceStatusBoundaryService,
    ComplianceProjectionService,
    ComplianceMonitoringService,
    ComplianceDashboardService,
    ComplianceRevalidationService,
  ],
  exports: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    ComplianceStatusBoundaryService,
    ComplianceProjectionService,
    ComplianceMonitoringService,
    ComplianceDashboardService,
    ComplianceRevalidationService,
  ],
})
export class ComplianceModule {}
