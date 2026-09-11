import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { ServiceCatalogAuditService } from './service-catalog-audit.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [ServiceCatalogValidationService, ServiceCatalogAuditService],
  exports: [ServiceCatalogValidationService, ServiceCatalogAuditService],
})
export class ServiceCatalogCommonModule {}
