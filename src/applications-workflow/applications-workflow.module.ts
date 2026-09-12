import { Module } from '@nestjs/common';

import { CaseAssignmentsService } from './case-assignments/case-assignments.service';
import { CaseEscalationsService } from './case-escalations/case-escalations.service';
import { CaseIssuesService } from './case-issues/case-issues.service';
import { CaseReferralResponsesService } from './case-referrals/case-referral-responses.service';
import { CaseReferralsService } from './case-referrals/case-referrals.service';
import { CaseSlaClocksService } from './case-sla/case-sla-clocks.service';
import { ApplicationsWorkflowCommonModule } from './common/applications-workflow-common.module';

@Module({
  imports: [ApplicationsWorkflowCommonModule],
  providers: [
    CaseAssignmentsService,
    CaseReferralsService,
    CaseReferralResponsesService,
    CaseSlaClocksService,
    CaseEscalationsService,
    CaseIssuesService,
  ],
  exports: [
    CaseAssignmentsService,
    CaseReferralsService,
    CaseReferralResponsesService,
    CaseSlaClocksService,
    CaseEscalationsService,
    CaseIssuesService,
  ],
})
export class ApplicationsWorkflowModule {}
