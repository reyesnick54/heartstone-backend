import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth/auth.module';
import { IdentityModule } from '../identity/identity.module';
import { ServiceCatalogCommonModule } from './common/service-catalog-common.module';
import { EligibilityController } from './eligibility/eligibility.controller';
import { EligibilityCheckService } from './eligibility/eligibility-check.service';
import { EligibilityEvaluatorService } from './eligibility/eligibility-evaluator.service';
import { EligibilityRulesService } from './eligibility/eligibility-rules.service';
import { EligibilityRulesAdminController } from './eligibility/eligibility-rules-admin.controller';
import { ServiceCatalogAdminGuard } from './eligibility/guards/service-catalog-admin.guard';
import { ServiceMatcherService } from './eligibility/service-matcher.service';
import { GovernmentServicesController } from './government-services/government-services.controller';
import { GovernmentServicesService } from './government-services/government-services.service';

@Module({
  imports: [ServiceCatalogCommonModule, IdentityModule, AuthModule],
  controllers: [
    GovernmentServicesController,
    EligibilityController,
    EligibilityRulesAdminController,
  ],
  providers: [
    GovernmentServicesService,
    EligibilityRulesService,
    EligibilityCheckService,
    EligibilityEvaluatorService,
    ServiceMatcherService,
    ServiceCatalogAdminGuard,
  ],
  exports: [
    GovernmentServicesService,
    EligibilityRulesService,
    EligibilityCheckService,
    EligibilityEvaluatorService,
    ServiceMatcherService,
  ],
import { ActivationGovernanceModule } from './activation-governance/activation-governance.module';
import { ServiceCatalogCommonModule } from './common/service-catalog-common.module';
import { GovernmentServiceVersionsModule } from './government-service-versions/government-service-versions.module';
import { GovernmentServicesModule } from './government-services/government-services.module';
import { PublicServiceDiscoveryController } from './public/public-service-discovery.controller';
import { PublicServiceDiscoveryService } from './public/public-service-discovery.service';
import { PublicServiceFamiliesController } from './public/public-service-families.controller';

@Module({
  imports: [
    ServiceCatalogCommonModule,
    GovernmentServicesModule,
    GovernmentServiceVersionsModule,
    ActivationGovernanceModule,
  ],
  controllers: [PublicServiceDiscoveryController, PublicServiceFamiliesController],
  providers: [PublicServiceDiscoveryService],
  exports: [PublicServiceDiscoveryService, ActivationGovernanceModule],
})
export class ServiceCatalogModule {}
