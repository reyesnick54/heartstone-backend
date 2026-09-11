import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { ServiceCatalogCommonModule } from '../common/service-catalog-common.module';
import { ServiceFunctionMappingsService } from '../service-function-mappings/service-function-mappings.service';
import { GovernmentServiceVersionsController } from './government-service-versions.controller';
import { GovernmentServiceVersionsService } from './government-service-versions.service';

@Module({
  imports: [ServiceCatalogCommonModule, AuthModule],
  controllers: [GovernmentServiceVersionsController],
  providers: [GovernmentServiceVersionsService, ServiceFunctionMappingsService],
  exports: [GovernmentServiceVersionsService],
})
export class GovernmentServiceVersionsModule {}
