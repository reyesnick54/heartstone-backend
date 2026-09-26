import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../application-processing/application-processing.module';
import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { RecordsModule } from '../records/records.module';
import { DecisionsController } from './decisions.controller';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@Module({
  imports: [SessionAuthGuardModule, AuthorityModule, ApplicationProcessingModule, RecordsModule],
  controllers: [DecisionsController],
  providers: [DecisionReadinessService, DecisionExecutionService, DecisionPreparationService],
  exports: [DecisionReadinessService, DecisionExecutionService, DecisionPreparationService],
})
export class DecisionsModule {}
