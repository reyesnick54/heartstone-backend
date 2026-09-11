import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { ServiceCatalogAuditService } from './service-catalog-audit.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [ServiceCatalogValidationService, ServiceCatalogAuditService],
  exports: [ServiceCatalogValidationService, ServiceCatalogAuditService],
import { RedisModule } from '../../redis/redis.module';
import { ServiceCatalogCacheService } from './service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from './service-catalog-lifecycle.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [RedisModule],
  providers: [
    ServiceCatalogValidationService,
    ServiceCatalogCacheService,
    ServiceCatalogLifecycleService,
  ],
  exports: [
    ServiceCatalogValidationService,
    ServiceCatalogCacheService,
    ServiceCatalogLifecycleService,
  ],
})
export class ServiceCatalogCommonModule {}
