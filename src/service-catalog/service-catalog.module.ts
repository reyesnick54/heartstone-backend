import { Module } from '@nestjs/common';

import { GovernmentServiceVersionsModule } from './government-service-versions/government-service-versions.module';
import { GovernmentServicesModule } from './government-services/government-services.module';

@Module({
  imports: [GovernmentServicesModule, GovernmentServiceVersionsModule],
})
export class ServiceCatalogModule {}
