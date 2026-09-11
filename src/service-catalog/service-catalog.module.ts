import { Module } from '@nestjs/common';

import { ServiceCatalogValidationService } from './common/service-catalog-validation.service';
import { ServiceDependencyDefinitionsController } from './dependency-definitions/service-dependency-definitions.controller';
import { ServiceDependencyDefinitionsService } from './dependency-definitions/service-dependency-definitions.service';
import { ServiceFeeDefinitionsController } from './fee-definitions/service-fee-definitions.controller';
import { ServiceFeeDefinitionsService } from './fee-definitions/service-fee-definitions.service';
import { GovernmentServicesController } from './government-services/government-services.controller';
import { GovernmentServicesService } from './government-services/government-services.service';
import { ServiceLevelTargetsController } from './level-targets/service-level-targets.controller';
import { ServiceLevelTargetsService } from './level-targets/service-level-targets.service';
import { ServiceOutputDefinitionsController } from './output-definitions/service-output-definitions.controller';
import { ServiceOutputDefinitionsService } from './output-definitions/service-output-definitions.service';
import { ServiceRedressRoutesController } from './redress-routes/service-redress-routes.controller';
import { ServiceRedressRoutesService } from './redress-routes/service-redress-routes.service';
import { ServiceVersionsController } from './service-versions/service-versions.controller';
import { ServiceVersionsService } from './service-versions/service-versions.service';

@Module({
  controllers: [
    GovernmentServicesController,
    ServiceVersionsController,
    ServiceFeeDefinitionsController,
    ServiceLevelTargetsController,
    ServiceDependencyDefinitionsController,
    ServiceOutputDefinitionsController,
    ServiceRedressRoutesController,
  ],
  providers: [
    GovernmentServicesService,
    ServiceVersionsService,
    ServiceFeeDefinitionsService,
    ServiceLevelTargetsService,
    ServiceDependencyDefinitionsService,
    ServiceOutputDefinitionsService,
    ServiceRedressRoutesService,
    ServiceCatalogValidationService,
  ],
  exports: [
    GovernmentServicesService,
    ServiceVersionsService,
    ServiceFeeDefinitionsService,
    ServiceLevelTargetsService,
    ServiceDependencyDefinitionsService,
    ServiceOutputDefinitionsService,
    ServiceRedressRoutesService,
  ],
})
export class ServiceCatalogModule {}
