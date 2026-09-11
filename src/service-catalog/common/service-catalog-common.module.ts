import { Module } from '@nestjs/common';

import { RedisModule } from '../../redis/redis.module';
import { ServiceCatalogCacheService } from './service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from './service-catalog-lifecycle.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

@Module({
  imports: [RedisModule],
  providers: [ServiceCatalogValidationService, ServiceCatalogCacheService, ServiceCatalogLifecycleService],
  exports: [
    ServiceCatalogValidationService,
    ServiceCatalogCacheService,
    ServiceCatalogLifecycleService,
  ],
})
export class ServiceCatalogCommonModule {}
