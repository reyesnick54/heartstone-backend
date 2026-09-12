import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { RecordsModule } from '../../records/records.module';
import { CaseFoundationService } from './case-foundation.service';
import { CaseCommunicationService } from './timeline/case-communication.service';
import { CaseCommunicationOutboxService } from './timeline/case-communication-outbox.service';
import { CaseDashboardReadService } from './timeline/case-dashboard-read.service';
import { CaseEventService } from './timeline/case-event.service';
import { CaseMilestoneService } from './timeline/case-milestone.service';
import { CasePublicStatusProjectionService } from './timeline/case-public-status-projection.service';
import { CaseTimelineController } from './timeline/case-timeline.controller';
import { MasterAdministrativeFileService } from '../../records/master-administrative-file.service';

@Module({
  imports: [AuthorityModule, SessionsModule, RecordsModule],
  controllers: [CaseTimelineController],
  providers: [
    SessionAuthGuard,
    CaseFoundationService,
    CaseEventService,
    CaseCommunicationService,
    CaseCommunicationOutboxService,
    CaseMilestoneService,
    CasePublicStatusProjectionService,
    CaseDashboardReadService,
  ],
  exports: [
    CaseFoundationService,
    CaseEventService,
    CaseCommunicationService,
    CaseMilestoneService,
    CasePublicStatusProjectionService,
    CaseDashboardReadService,
  ],
})
export class CasesModule {}
