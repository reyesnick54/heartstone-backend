import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { ApplicationCaseService } from './cases/application-case.service';
import { ApplicantCorrectionService } from './completeness-review/applicant-correction.service';
import { CompletenessReviewService } from './completeness-review/completeness-review.service';
import { DeficiencyNoticeService } from './completeness-review/deficiency-notice.service';
import { ApplicationSubmissionService } from './submissions/application-submission.service';
import { CaseWorkflowService } from './workflow/case-workflow.service';

@Module({
  imports: [AuthorityModule],
  providers: [
    CaseWorkflowService,
    ApplicationSubmissionService,
    ApplicationCaseService,
    DeficiencyNoticeService,
    CompletenessReviewService,
    ApplicantCorrectionService,
  ],
  exports: [
    CaseWorkflowService,
    ApplicationSubmissionService,
    ApplicationCaseService,
    CompletenessReviewService,
    DeficiencyNoticeService,
    ApplicantCorrectionService,
  ],
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  exports: [WorkflowModule],
})
export class ApplicationsModule {}
