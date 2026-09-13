import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { DecisionCatalogBoundaryService } from './common/decision-catalog-boundary.service';
import { DecisionCatalogValidationService } from './common/decision-catalog-validation.service';
import { DecisionTypeLifecycleService } from './lifecycle/decision-type-lifecycle.service';
import { DecisionTypeDefinitionsController } from './types/decision-type-definitions.controller';
import { DecisionTypeDefinitionsService } from './types/decision-type-definitions.service';
import { DecisionTypeVersionsController } from './versions/decision-type-versions.controller';
import { DecisionTypeVersionsService } from './versions/decision-type-versions.service';

@Module({
  imports: [SessionsModule, AuthorityModule],
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
})
export class DecisionsModule {}
