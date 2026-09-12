import { forwardRef, Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
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
import { CaseStatusService } from './case-status.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [
    ApplicationProcessingCommonModule,
    SessionsModule,
    AuthorityModule,
    forwardRef(() => ApplicationsModule),
  ],
  controllers: [CasesController],
  providers: [
    CasesService,
    CaseEventsService,
    CaseStatusService,
    CasePublicStatusService,
    WorkflowDefinitionsService,
    WorkflowRuntimeService,
    CompletenessReviewsService,
    CaseReferralsService,
    CaseSlaService,
  ],
  exports: [CasesService, WorkflowDefinitionsService, WorkflowRuntimeService],
})
export class CasesModule {}
