import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { PlatformAdminExperienceGuard } from './guards/platform-admin-experience.guard';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminBoundaryService } from './policy/platform-admin-boundary.service';
import { PlatformAdministrativeAccessPolicyService } from './policy/platform-administrative-access-policy.service';
import { PlatformAdminAvailableActionsService } from './services/platform-admin-available-actions.service';
import { PlatformAdminHomeService } from './services/platform-admin-home.service';
import { PlatformAdminProjectionService } from './services/platform-admin-projection.service';

@Module({
  imports: [DatabaseModule, SessionsModule, IdentityCommonModule],
  controllers: [PlatformAdminController],
  providers: [
    PlatformAdminExperienceGuard,
    PlatformAdministrativeAccessPolicyService,
    PlatformAdminBoundaryService,
    PlatformAdminHomeService,
    PlatformAdminProjectionService,
    PlatformAdminAvailableActionsService,
  ],
  exports: [
    PlatformAdministrativeAccessPolicyService,
    PlatformAdminBoundaryService,
    PlatformAdminHomeService,
    PlatformAdminProjectionService,
    PlatformAdminAvailableActionsService,
  ],
})
export class PlatformAdminModule {}
