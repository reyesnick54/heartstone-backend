import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { CivilRegistryModule } from '../../civil-registry/civil-registry.module';
import { CorporateRegistryModule } from '../../corporate-registry/corporate-registry.module';
import { DatabaseModule } from '../../database/database.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { OfficialExperienceGuard } from './guards/official-experience.guard';
import { OfficialController } from './official.controller';
import { OfficialCorporateRegistryController } from './official-corporate-registry.controller';
import { OfficialAlertsService } from './services/official-alerts.service';
import { OfficialAppointmentsService } from './services/official-appointments.service';
import { OfficialAvailableActionsService } from './services/official-available-actions.service';
import { OfficialCasesService } from './services/official-cases.service';
import { OfficialCivilRegistryProjectionService } from './services/official-civil-registry-projection.service';
import { OfficialContextService } from './services/official-context.service';
import { OfficialMeService } from './services/official-me.service';
import { OfficialScopeService } from './services/official-scope.service';
import { OfficialWorkQueueService } from './services/official-work-queue.service';
import { OfficialWorkspaceService } from './services/official-workspace.service';

@Module({
  imports: [
    DatabaseModule,
    SessionsModule,
    AuthorityModule,
    SchedulingModule,
    CivilRegistryModule,
    CorporateRegistryModule,
  ],
  controllers: [OfficialController, OfficialCorporateRegistryController],
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
    OfficialAppointmentsService,
    OfficialCivilRegistryProjectionService,
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
    OfficialAppointmentsService,
    OfficialCivilRegistryProjectionService,
  ],
})
export class OfficialModule {}
