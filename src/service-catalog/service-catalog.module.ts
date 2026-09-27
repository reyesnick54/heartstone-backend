import { Module } from '@nestjs/common';

import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { ActivationGovernanceModule } from './activation-governance/activation-governance.module';
import { ServiceCatalogCommonModule } from './common/service-catalog-common.module';
import { FormsModule } from './forms/forms.module';
import { GovernmentServiceVersionsModule } from './government-service-versions/government-service-versions.module';
import { GovernmentServicesController } from './government-services/government-services.controller';
import { GovernmentServicesService } from './government-services/government-services.service';
import { PublicServiceDiscoveryController } from './public/public-service-discovery.controller';
import { PublicServiceDiscoveryService } from './public/public-service-discovery.service';
import { PublicServiceFamiliesController } from './public/public-service-families.controller';
import { ServicePackModule } from './service-pack/service-pack.module';
import { ServicePackDeploymentModule } from './service-packs/service-pack-deployment.module';

@Module({
  imports: [
    ServiceCatalogCommonModule,
    SessionAuthGuardModule,
    GovernmentServiceVersionsModule,
    ActivationGovernanceModule,
    ServicePackModule,
    ServicePackDeploymentModule,
    FormsModule,
  ],
  controllers: [
    GovernmentServicesController,
    PublicServiceDiscoveryController,
    PublicServiceFamiliesController,
  ],
  providers: [GovernmentServicesService, PublicServiceDiscoveryService],
  exports: [
    PublicServiceDiscoveryService,
    ActivationGovernanceModule,
    ServicePackModule,
    ServicePackDeploymentModule,
    FormsModule,
    GovernmentServicesService,
  ],
})
export class ServiceCatalogModule {}
