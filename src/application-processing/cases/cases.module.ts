import { forwardRef, Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationProcessingCommonModule } from '../common/application-processing-common.module';
import { CompletenessReviewsService } from '../completeness/completeness-reviews.service';
import { CasePublicStatusService } from '../public-status/case-public-status.service';
import { CaseReferralsService } from '../referrals/case-referrals.service';
import { CaseSlaService } from '../sla/case-sla.service';
import { WorkflowDefinitionsService } from '../workflow/workflow-definitions.service';
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service';
import { CaseEventsService } from './case-events.service';
import { CaseFoundationService } from './case-foundation.service';
import { CaseStatusService } from './case-status.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseCommunicationService } from './timeline/case-communication.service';
import { CaseCommunicationOutboxService } from './timeline/case-communication-outbox.service';
import { CaseDashboardReadService } from './timeline/case-dashboard-read.service';
import { CaseEventService } from './timeline/case-event.service';
import { CaseMilestoneService } from './timeline/case-milestone.service';
import { CasePublicStatusProjectionService } from './timeline/case-public-status-projection.service';
import { CaseTimelineController } from './timeline/case-timeline.controller';

@Module({
  imports: [
    ApplicationProcessingCommonModule,
    SessionsModule,
    AuthorityModule,
    forwardRef(() => ApplicationsModule),
  ],
  controllers: [CasesController, CaseTimelineController],
  providers: [
    SessionAuthGuard,
    CasesService,
    CaseFoundationService,
    CaseEventsService,
    CaseEventService,
    CaseStatusService,
    CasePublicStatusService,
    CasePublicStatusProjectionService,
    CaseCommunicationService,
    CaseCommunicationOutboxService,
    CaseMilestoneService,
    CaseDashboardReadService,
    WorkflowDefinitionsService,
    WorkflowRuntimeService,
    CompletenessReviewsService,
    CaseReferralsService,
    CaseSlaService,
  ],
  exports: [
    CasesService,
    CaseFoundationService,
    CaseEventService,
    CasePublicStatusProjectionService,
    WorkflowDefinitionsService,
    WorkflowRuntimeService,
  ],
})
export class CasesModule {}
