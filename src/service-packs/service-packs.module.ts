import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ServicePacksCommonModule } from './common/service-packs-common.module';
import { ServicePackGovernanceModule } from './governance/service-pack-governance.module';
import { ServicePacksService } from './packs/service-packs.service';
import { ServicePacksController } from './service-packs.controller';
import { ServicePackValidationService } from './validation/service-pack-validation.service';
import { ServicePackVersionService } from './versions/service-pack-version.service';

@Module({
  imports: [DatabaseModule, SessionsModule, ServicePacksCommonModule, ServicePackGovernanceModule],
  controllers: [ServicePacksController],
  providers: [
    ServicePacksService,
    ServicePackValidationService,
    ServicePackVersionService,
    SessionAuthGuard,
  ],
  exports: [ServicePacksCommonModule, ServicePacksService, ServicePackValidationService],
})
export class ServicePacksModule {}
