import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { RedisModule } from '../../redis/redis.module';
import { ServiceCatalogAuditService } from './service-catalog-audit.service';
import { ServiceCatalogCacheService } from './service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from './service-catalog-lifecycle.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [RedisModule, IdentityCommonModule],
  providers: [
    ServiceCatalogValidationService,
    ServiceCatalogCacheService,
    ServiceCatalogLifecycleService,
    ServiceCatalogAuditService,
  ],
  exports: [
    ServiceCatalogValidationService,
    ServiceCatalogCacheService,
    ServiceCatalogLifecycleService,
    ServiceCatalogAuditService,
  ],
})
export class ServiceCatalogCommonModule {}
