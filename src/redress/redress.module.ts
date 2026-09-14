import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ReviewAssignmentService } from './assignment/review-assignment.service';
import { ReviewerIndependenceService } from './assignment/reviewer-independence.service';
import { ExternalReviewBoundaryService } from './common/external-review-boundary.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { ReviewEvidenceAdmissionService } from './evidence/review-evidence-admission.service';
import { ExternalReviewDeterminationService } from './external-review/external-review-determination.service';
import { ExternalReviewPackageService } from './external-review/external-review-package.service';
import { ExternalReviewReferralService } from './external-review/external-review-referral.service';
import { JudicialReviewInformationService } from './external-review/judicial-review-information.service';
import { OmbudsOversightReferralService } from './external-review/ombuds-oversight-referral.service';
import { ProfessionalChallengeReferralService } from './external-review/professional-challenge-referral.service';
import { RegulatoryReviewReferralService } from './external-review/regulatory-review-referral.service';
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
    ExternalReviewBoundaryService,
    ExternalReviewReferralService,
    ExternalReviewPackageService,
    ExternalReviewDeterminationService,
    ProfessionalChallengeReferralService,
    RegulatoryReviewReferralService,
    OmbudsOversightReferralService,
    JudicialReviewInformationService,
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
    ExternalReviewBoundaryService,
    ExternalReviewReferralService,
    ExternalReviewPackageService,
    ExternalReviewDeterminationService,
    ProfessionalChallengeReferralService,
    RegulatoryReviewReferralService,
    OmbudsOversightReferralService,
    JudicialReviewInformationService,
  ],
})
export class RedressModule {}
