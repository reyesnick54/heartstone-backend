import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DecisionsIssuanceModule } from '../decisions-issuance/decisions-issuance.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { DecisionCatalogBoundaryService } from './common/decision-catalog-boundary.service';
import { DecisionCatalogValidationService } from './common/decision-catalog-validation.service';
import { DecisionTypeLifecycleService } from './lifecycle/decision-type-lifecycle.service';
import { DecisionTypeDefinitionsController } from './types/decision-type-definitions.controller';
import { DecisionTypeDefinitionsService } from './types/decision-type-definitions.service';
import { DecisionTypeVersionsController } from './versions/decision-type-versions.controller';
import { DecisionTypeVersionsService } from './versions/decision-type-versions.service';

@Module({
  imports: [SessionsModule, AuthorityModule, DecisionsIssuanceModule],
  controllers: [DecisionTypeDefinitionsController, DecisionTypeVersionsController],
  providers: [
    DecisionCatalogValidationService,
    DecisionCatalogBoundaryService,
    DecisionTypeDefinitionsService,
    DecisionTypeVersionsService,
    DecisionTypeLifecycleService,
  ],
  exports: [
    DecisionCatalogBoundaryService,
    DecisionCatalogValidationService,
    DecisionTypeDefinitionsService,
    DecisionTypeVersionsService,
    DecisionTypeLifecycleService,
  ],
import { ApplicationProcessingModule } from '../application-processing/application-processing.module';
import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordsModule } from '../records/records.module';
import { DecisionsController } from './decisions.controller';
import { DecisionExecutionService } from './execution/decision-execution.service';
import { DecisionPreparationService } from './preparation/decision-preparation.service';
import { DecisionReadinessService } from './readiness/decision-readiness.service';

@Module({
  imports: [SessionsModule, AuthorityModule, ApplicationProcessingModule, RecordsModule],
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
