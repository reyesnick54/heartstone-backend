import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ActivationGovernanceModule } from './activation-governance/activation-governance.module';
import { ServiceCatalogCommonModule } from './common/service-catalog-common.module';
import { FormsModule } from './forms/forms.module';
import { GovernmentServiceVersionsModule } from './government-service-versions/government-service-versions.module';
import { GovernmentServicesController } from './government-services/government-services.controller';
import { GovernmentServicesService } from './government-services/government-services.service';
import { PublicServiceDiscoveryController } from './public/public-service-discovery.controller';
import { PublicServiceDiscoveryService } from './public/public-service-discovery.service';
import { PublicServiceFamiliesController } from './public/public-service-families.controller';

@Module({
  imports: [
    ServiceCatalogCommonModule,
    SessionsModule,
    GovernmentServiceVersionsModule,
    ActivationGovernanceModule,
    FormsModule,
  ],
  controllers: [
    GovernmentServicesController,
    PublicServiceDiscoveryController,
    PublicServiceFamiliesController,
  ],
  providers: [GovernmentServicesService, PublicServiceDiscoveryService, SessionAuthGuard],
  exports: [
    PublicServiceDiscoveryService,
    ActivationGovernanceModule,
    FormsModule,
    GovernmentServicesService,
  ],
})
export class ServiceCatalogModule {}
