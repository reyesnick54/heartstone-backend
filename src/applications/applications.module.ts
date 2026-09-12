import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { ApplicationCaseService } from './cases/application-case.service';
import { ApplicantCorrectionService } from './completeness-review/applicant-correction.service';
import { CompletenessReviewService } from './completeness-review/completeness-review.service';
import { DeficiencyNoticeService } from './completeness-review/deficiency-notice.service';
import { ApplicationSubmissionService } from './submissions/application-submission.service';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [AuthorityModule, WorkflowModule],
  providers: [
    ApplicationSubmissionService,
    ApplicationCaseService,
    DeficiencyNoticeService,
    CompletenessReviewService,
    ApplicantCorrectionService,
  ],
  exports: [
    WorkflowModule,
    ApplicationSubmissionService,
    ApplicationCaseService,
    CompletenessReviewService,
    DeficiencyNoticeService,
    ApplicantCorrectionService,
  ],
})
export class ApplicationsModule {}
