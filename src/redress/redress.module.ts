import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SubstantiveAppealService } from './appeals/substantive-appeal.service';
import { ComplaintService } from './complaints/complaint.service';
import { ComplaintAssignmentService } from './complaints/complaint-assignment.service';
import { ComplaintBoundaryService } from './complaints/complaint-boundary.service';
import { ComplaintClosureService } from './complaints/complaint-closure.service';
import { ComplaintFindingService } from './complaints/complaint-finding.service';
import { ComplaintInvestigationService } from './complaints/complaint-investigation.service';
import { ComplaintPublicViewService } from './complaints/complaint-public-view.service';
import { ComplaintRemedyService } from './complaints/complaint-remedy.service';
import { ComplaintsController } from './complaints/complaints.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ComplaintsController],
  providers: [
    ComplaintBoundaryService,
    ComplaintService,
    ComplaintAssignmentService,
    ComplaintInvestigationService,
    ComplaintFindingService,
    ComplaintRemedyService,
    ComplaintClosureService,
    ComplaintPublicViewService,
    SubstantiveAppealService,
  ],
  exports: [
    ComplaintBoundaryService,
    ComplaintService,
    ComplaintAssignmentService,
    ComplaintInvestigationService,
    ComplaintFindingService,
    ComplaintRemedyService,
    ComplaintClosureService,
    ComplaintPublicViewService,
    SubstantiveAppealService,
import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { AutomationChallengeService } from './automation/automation-challenge.service';
import { ClarificationService } from './clarification/clarification.service';
import { RedressAccessService } from './common/redress-access.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressSafeHaltService } from './common/redress-safe-halt.service';
import { ComplaintService } from './complaints/complaint.service';
import { AdministrativeCorrectionService } from './correction/administrative-correction.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { ExternalReviewService } from './external/external-review.service';
import { DeadlineExtensionService } from './filings/deadline-extension.service';
import { RedressFilingService } from './filings/redress-filing.service';
import { RedressStandingService } from './filings/redress-standing.service';
import { RedressTimelinessService } from './filings/redress-timeliness.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { RedressController } from './redress.controller';
import { InternalReviewService } from './review/internal-review.service';
import { ReconsiderationService } from './review/reconsideration.service';
import { ReviewAssignmentService } from './review/review-assignment.service';
import { ReviewSnapshotService } from './review/review-snapshot.service';
import { ReviewerIndependenceService } from './review/reviewer-independence.service';
import { RedressRouteCatalogService } from './routing/redress-route-catalog.service';

@Module({
  imports: [DatabaseModule, AuthorityModule, SessionsModule, InstrumentsModule],
  controllers: [RedressController],
  providers: [
    SessionAuthGuard,
    RedressBoundaryService,
    RedressAccessService,
    RedressSafeHaltService,
    RedressRouteCatalogService,
    RedressMatterService,
    RedressFilingService,
    RedressStandingService,
    RedressTimelinessService,
    DeadlineExtensionService,
    ComplaintService,
    AdministrativeCorrectionService,
    ClarificationService,
    AutomationChallengeService,
    ReviewAssignmentService,
    ReviewerIndependenceService,
    ReviewSnapshotService,
    ReconsiderationService,
    InternalReviewService,
    ExternalReviewService,
    RedressDecisionService,
    InterimReliefService,
    RedressImplementationService,
    RedressNoticeService,
  ],
  exports: [
    RedressBoundaryService,
    RedressAccessService,
    RedressSafeHaltService,
    RedressRouteCatalogService,
    RedressMatterService,
    RedressFilingService,
    RedressStandingService,
    RedressTimelinessService,
    DeadlineExtensionService,
    ComplaintService,
    AdministrativeCorrectionService,
    ClarificationService,
    AutomationChallengeService,
    ReviewAssignmentService,
    ReviewerIndependenceService,
    ReviewSnapshotService,
    ReconsiderationService,
    InternalReviewService,
    ExternalReviewService,
    RedressDecisionService,
    InterimReliefService,
    RedressImplementationService,
    RedressNoticeService,
  ],
})
export class RedressModule {}
