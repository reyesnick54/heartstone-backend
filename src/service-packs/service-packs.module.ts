import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { ServicePacksCommonModule } from './common/service-packs-common.module';
import { ServicePackGovernanceModule } from './governance/service-pack-governance.module';
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
  imports: [DatabaseModule, SessionAuthGuardModule, ServicePacksCommonModule, ServicePackGovernanceModule],
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
