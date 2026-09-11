import { Module } from '@nestjs/common';

import { IdentityModule } from '../../identity/identity.module';
import { ServiceCatalogAuditService } from './service-catalog-audit.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [IdentityModule],
  providers: [ServiceCatalogValidationService, ServiceCatalogAuditService],
  exports: [ServiceCatalogValidationService, ServiceCatalogAuditService],
})
export class ServiceCatalogCommonModule {}
