import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { FeatureActivationService } from './feature-activation/feature-activation.service';
import { AcceptanceDecisionService } from './institutional-acceptance/acceptance-decision.service';
import { AcceptanceReviewService } from './institutional-acceptance/acceptance-review.service';
import { InstitutionalAcceptanceDossierService } from './institutional-acceptance/institutional-acceptance-dossier.service';
import { ProductionActivationService } from './institutional-acceptance/production-activation.service';
import { ResidualRiskService } from './institutional-acceptance/residual-risk.service';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  providers: [
    ProductionReadinessBoundaryService,
    InstitutionalAcceptanceDossierService,
    AcceptanceReviewService,
    AcceptanceDecisionService,
    ResidualRiskService,
    ProductionActivationService,
    FeatureActivationService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    InstitutionalAcceptanceDossierService,
    AcceptanceReviewService,
    AcceptanceDecisionService,
    ResidualRiskService,
    ProductionActivationService,
    FeatureActivationService,
  ],
})
export class ProductionReadinessModule {}
