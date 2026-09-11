import { Module } from '@nestjs/common';

import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  providers: [ServiceCatalogValidationService],
  exports: [ServiceCatalogValidationService],
})
export class ServiceCatalogCommonModule {}
