import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../application-processing/application-processing.module';
import { AuthorityModule } from '../authority/authority.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordsModule } from '../records/records.module';
import { DecisionsController } from './decisions.controller';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@Module({
  imports: [
    SessionsModule,
    ActorContextModule,
    AuthorityModule,
    ApplicationProcessingModule,
    RecordsModule,
  ],
  controllers: [DecisionsController],
  providers: [
    SessionAuthGuard,
    DecisionReadinessService,
    DecisionExecutionService,
    DecisionPreparationService,
  ],
  exports: [DecisionReadinessService, DecisionExecutionService, DecisionPreparationService],
})
export class DecisionsModule {}
