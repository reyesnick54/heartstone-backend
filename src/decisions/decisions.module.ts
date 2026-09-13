import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../application-processing/application-processing.module';
import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordsModule } from '../records/records.module';
import { DecisionsController, GovernmentDecisionsController } from './decisions.controller';
import { DecisionAssistanceService } from './decision-assistance.service';
import { GovernmentDecisionsService } from './government-decisions.service';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@Module({
  imports: [SessionsModule, AuthorityModule, ApplicationProcessingModule, RecordsModule],
  controllers: [DecisionsController, GovernmentDecisionsController],
  providers: [
    SessionAuthGuard,
    DecisionReadinessService,
    DecisionExecutionService,
    DecisionPreparationService,
    GovernmentDecisionsService,
    DecisionAssistanceService,
  ],
  exports: [
    DecisionReadinessService,
    DecisionExecutionService,
    DecisionPreparationService,
    GovernmentDecisionsService,
    DecisionAssistanceService,
  ],
})
export class DecisionsModule {}
