import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ReviewAssignmentService } from './assignment/review-assignment.service';
import { ReviewerIndependenceService } from './assignment/reviewer-independence.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { ReviewEvidenceAdmissionService } from './evidence/review-evidence-admission.service';
import { InternalAdministrativeReviewService } from './proceeding/internal-administrative-review.service';
import { ReconsiderationProceedingService } from './proceeding/reconsideration-proceeding.service';
import { ReviewRecommendationService } from './recommendation/review-recommendation.service';
import { ReviewRecordSnapshotService } from './snapshot/review-record-snapshot.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  providers: [
    RedressBoundaryService,
    ReviewRecordSnapshotService,
    ReviewerIndependenceService,
    ReviewAssignmentService,
    ReconsiderationProceedingService,
    InternalAdministrativeReviewService,
    ReviewEvidenceAdmissionService,
    ReviewRecommendationService,
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
  ],
})
export class RedressModule {}
