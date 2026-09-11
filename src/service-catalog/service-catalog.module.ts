import { Module } from '@nestjs/common';

import { ServiceCatalogCommonModule } from './common/service-catalog-common.module';
import { GovernmentServiceVersionsModule } from './government-service-versions/government-service-versions.module';
import { GovernmentServicesModule } from './government-services/government-services.module';
import { PublicServiceDiscoveryController } from './public/public-service-discovery.controller';
import { PublicServiceDiscoveryService } from './public/public-service-discovery.service';
import { PublicServiceFamiliesController } from './public/public-service-families.controller';

@Module({
  imports: [ServiceCatalogCommonModule, GovernmentServicesModule, GovernmentServiceVersionsModule],
  controllers: [PublicServiceDiscoveryController, PublicServiceFamiliesController],
  providers: [PublicServiceDiscoveryService],
  exports: [PublicServiceDiscoveryService],
})
export class ServiceCatalogModule {}
