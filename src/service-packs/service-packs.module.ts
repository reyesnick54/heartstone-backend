import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ServicePacksCommonModule } from './common/service-packs-common.module';
import { ServicePackJurisdictionBindingService } from './jurisdiction/service-pack-jurisdiction-binding.service';
import { ServicePacksService } from './packs/service-packs.service';
import { ServicePackExportService } from './portability/service-pack-export.service';
import { ServicePackImportService } from './portability/service-pack-import.service';
import { ServicePackPortabilityAccessService } from './portability/service-pack-portability-access.service';
import { ServicePackInventoryService } from './registry/service-pack-inventory.service';
import { ServicePackRegistryService } from './registry/service-pack-registry.service';
import { ServicePackUpgradePlanService } from './registry/service-pack-upgrade-plan.service';
import { ServicePacksRegistryController } from './registry/service-packs-registry.controller';
import { ServicePacksController } from './service-packs.controller';
import { ServicePackTemplateCloneService } from './template/service-pack-template-clone.service';
import { ServicePackValidationService } from './validation/service-pack-validation.service';
import { ServicePackVersionService } from './versions/service-pack-version.service';

@Module({
  imports: [DatabaseModule, SessionsModule, ServicePacksCommonModule],
  controllers: [ServicePacksRegistryController, ServicePacksController],
  providers: [
    ServicePacksService,
    ServicePackValidationService,
    ServicePackVersionService,
    ServicePackExportService,
    ServicePackImportService,
    ServicePackPortabilityAccessService,
    ServicePackJurisdictionBindingService,
    ServicePackTemplateCloneService,
    ServicePackRegistryService,
    ServicePackInventoryService,
    ServicePackUpgradePlanService,
    SessionAuthGuard,
  ],
  exports: [
    ServicePacksCommonModule,
    ServicePacksService,
    ServicePackValidationService,
    ServicePackRegistryService,
    ServicePackExportService,
    ServicePackImportService,
  ],
})
export class ServicePacksModule {}
