import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { IdentityModule } from '../../identity/identity.module';
import { ServiceCatalogCommonModule } from '../common/service-catalog-common.module';
import { GovernmentServicesModule } from '../government-services/government-services.module';
import { EligibilityController } from './eligibility.controller';
import { EligibilityCheckService } from './eligibility-check.service';
import { EligibilityEvaluatorService } from './eligibility-evaluator.service';
import { EligibilityRulesService } from './eligibility-rules.service';
import { EligibilityRulesAdminController } from './eligibility-rules-admin.controller';
import { EligibilityValidationService } from './eligibility-validation.service';
import { EligibilityVersionAccessService } from './eligibility-version-access.service';
import { ServiceCatalogAdminGuard } from './guards/service-catalog-admin.guard';
import { ServiceMatcherService } from './service-matcher.service';

@Module({
  imports: [ServiceCatalogCommonModule, GovernmentServicesModule, IdentityModule, AuthModule],
  controllers: [EligibilityController, EligibilityRulesAdminController],
  providers: [
    EligibilityRulesService,
    EligibilityCheckService,
    EligibilityEvaluatorService,
    EligibilityValidationService,
    EligibilityVersionAccessService,
    ServiceMatcherService,
    ServiceCatalogAdminGuard,
  ],
  exports: [
    EligibilityRulesService,
    EligibilityCheckService,
    EligibilityEvaluatorService,
    EligibilityValidationService,
    EligibilityVersionAccessService,
    ServiceMatcherService,
  ],
})
export class EligibilityModule {}
