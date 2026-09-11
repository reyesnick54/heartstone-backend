import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { ServiceCatalogCommonModule } from '../common/service-catalog-common.module';
import { GovernmentServiceVersionsService } from '../government-service-versions/government-service-versions.service';
import { ServiceFunctionMappingsService } from '../service-function-mappings/service-function-mappings.service';
import { GovernmentServicesController } from './government-services.controller';
import { GovernmentServicesService } from './government-services.service';

@Module({
  imports: [ServiceCatalogCommonModule, AuthModule],
  controllers: [GovernmentServicesController],
  providers: [
    GovernmentServicesService,
    GovernmentServiceVersionsService,
    ServiceFunctionMappingsService,
  ],
  exports: [
    GovernmentServicesService,
    GovernmentServiceVersionsService,
    ServiceFunctionMappingsService,
  ],
})
export class GovernmentServicesModule {}
