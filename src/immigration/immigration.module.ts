import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { CitizenExperienceModule } from '../experience/citizen/citizen-experience.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ImmigrationAccessService } from './access/immigration-access.service';
import { ImmigrationApplicationProfileService } from './applications/immigration-application-profile.service';
import { ImmigrationExperienceBoundaryService } from './boundary/immigration-experience-boundary.service';
import { ImmigrationBoundaryService } from './common/immigration-boundary.service';
import { ImmigrationCredentialService } from './credentials/immigration-credential.service';
import { CitizenImmigrationController } from './experience/citizen-immigration.controller';
import { OfficialImmigrationController } from './experience/official-immigration.controller';
import { CitizenImmigrationProjectionService } from './experience/services/citizen-immigration-projection.service';
import { ImmigrationScopeService } from './experience/services/immigration-scope.service';
import { OfficialImmigrationProjectionService } from './experience/services/official-immigration-projection.service';
import { ImmigrationExternalCheckService } from './external/immigration-external-check.service';
import { ImmigrationController } from './immigration.controller';
import { ImmigrationProfileService } from './profiles/immigration-profile.service';
import { ImmigrationStatusService } from './status/immigration-status.service';

@Module({
  imports: [
    DatabaseModule,
    SessionsModule,
    CitizenExperienceModule,
    OfficialModule,
    AuthorityModule,
  ],
  controllers: [ImmigrationController, CitizenImmigrationController, OfficialImmigrationController],
  providers: [
    ImmigrationBoundaryService,
    ImmigrationProfileService,
    ImmigrationApplicationProfileService,
    ImmigrationStatusService,
    ImmigrationExternalCheckService,
    ImmigrationAccessService,
    ImmigrationCredentialService,
    ImmigrationExperienceBoundaryService,
    ImmigrationScopeService,
    CitizenImmigrationProjectionService,
    OfficialImmigrationProjectionService,
  ],
  exports: [
    ImmigrationBoundaryService,
    ImmigrationProfileService,
    ImmigrationApplicationProfileService,
    ImmigrationStatusService,
    ImmigrationExternalCheckService,
    ImmigrationAccessService,
    ImmigrationCredentialService,
    ImmigrationExperienceBoundaryService,
    ImmigrationScopeService,
    CitizenImmigrationProjectionService,
    OfficialImmigrationProjectionService,
  ],
})
export class ImmigrationModule {}
