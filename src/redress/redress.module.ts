import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ReviewAssignmentService } from './assignment/review-assignment.service';
import { ReviewerIndependenceService } from './assignment/reviewer-independence.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { ReviewEvidenceAdmissionService } from './evidence/review-evidence-admission.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim-relief/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { InternalAdministrativeReviewService } from './proceeding/internal-administrative-review.service';
import { ReconsiderationProceedingService } from './proceeding/reconsideration-proceeding.service';
import { ReviewRecommendationService } from './recommendation/review-recommendation.service';
import { RedressController } from './redress.controller';
import { ReviewRecordSnapshotService } from './snapshot/review-record-snapshot.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [RedressController],
  providers: [
    RedressBoundaryService,
    ReviewRecordSnapshotService,
    ReviewerIndependenceService,
    ReviewAssignmentService,
    ReconsiderationProceedingService,
    InternalAdministrativeReviewService,
    ReviewEvidenceAdmissionService,
    ReviewRecommendationService,
    RedressMatterService,
    RedressDecisionService,
    InterimReliefService,
    RedressImplementationService,
    RedressNoticeService,
  ],
  exports: [
    RedressBoundaryService,
    ReviewRecordSnapshotService,
    ReviewerIndependenceService,
    ReviewAssignmentService,
    ReconsiderationProceedingService,
    InternalAdministrativeReviewService,
    ReviewEvidenceAdmissionService,
    ReviewRecommendationService,
    RedressMatterService,
    RedressDecisionService,
    InterimReliefService,
    RedressImplementationService,
    RedressNoticeService,
  ],
})
export class RedressModule {}
