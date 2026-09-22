import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ImmigrationAccessService } from './access/immigration-access.service';
import { ImmigrationApplicationProfileService } from './applications/immigration-application-profile.service';
import { ImmigrationBoundaryService } from './common/immigration-boundary.service';
import { ImmigrationCredentialService } from './credentials/immigration-credential.service';
import { ImmigrationExternalCheckService } from './external/immigration-external-check.service';
import { ImmigrationController } from './immigration.controller';
import { ImmigrationProfileService } from './profiles/immigration-profile.service';
import { ImmigrationStatusService } from './status/immigration-status.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImmigrationController],
  providers: [
    ImmigrationBoundaryService,
    ImmigrationProfileService,
    ImmigrationApplicationProfileService,
    ImmigrationStatusService,
    ImmigrationExternalCheckService,
    ImmigrationAccessService,
    ImmigrationCredentialService,
  ],
  exports: [
    ImmigrationBoundaryService,
    ImmigrationProfileService,
    ImmigrationApplicationProfileService,
    ImmigrationStatusService,
    ImmigrationExternalCheckService,
    ImmigrationAccessService,
    ImmigrationCredentialService,
  ],
})
export class ImmigrationModule {}
