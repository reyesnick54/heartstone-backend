import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { DatabaseModule } from '../../database/database.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { OfficialExperienceGuard } from './guards/official-experience.guard';
import { OfficialController } from './official.controller';
import { OfficialAlertsService } from './services/official-alerts.service';
import { OfficialAvailableActionsService } from './services/official-available-actions.service';
import { OfficialCasesService } from './services/official-cases.service';
import { OfficialContextService } from './services/official-context.service';
import { OfficialMeService } from './services/official-me.service';
import { OfficialScopeService } from './services/official-scope.service';
import { OfficialWorkQueueService } from './services/official-work-queue.service';
import { OfficialWorkspaceService } from './services/official-workspace.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [OfficialController],
  providers: [
    SessionAuthGuard,
    OfficialExperienceGuard,
    OfficialContextService,
    OfficialScopeService,
    OfficialMeService,
    OfficialWorkspaceService,
    OfficialWorkQueueService,
    OfficialCasesService,
    OfficialAvailableActionsService,
    OfficialAlertsService,
  ],
  exports: [
    OfficialContextService,
    OfficialScopeService,
    OfficialMeService,
    OfficialWorkspaceService,
    OfficialWorkQueueService,
    OfficialCasesService,
    OfficialAvailableActionsService,
    OfficialAlertsService,
  ],
})
export class OfficialModule {}
